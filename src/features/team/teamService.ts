import { supabase } from '../../lib/supabase';
import type { TeamMember } from '../../types';

export const teamService = {
  // Compress image helper
  compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas context could not be created'));
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  },

  // Fetch all team members
  async getTeamMembers(): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add a new member (photo upload + DB insert)
  async createTeamMember(
    params: {
      fullName: string;
      designation: string;
      category: 'hod' | 'oia' | 'placement_coordinator' | 'ssra';
      department?: string | null;
      description?: string | null;
      photoFile: File;
      email?: string | null;
      phone?: string | null;
      linkedinUrl?: string | null;
      githubUrl?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    }
  ): Promise<TeamMember> {
    // 1. Compress image
    let uploadBlob: Blob = params.photoFile;
    const fileExt = params.photoFile.name.split('.').pop() || 'jpg';
    if (params.photoFile.type.startsWith('image/')) {
      try {
        uploadBlob = await this.compressImage(params.photoFile);
      } catch (err) {
        console.warn('Image compression failed, using original file:', err);
      }
    }

    // 2. Generate unique filename
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    // 3. Upload to team-members storage bucket
    const { error: uploadError } = await supabase.storage
      .from('team-members')
      .upload(filePath, uploadBlob, {
        contentType: params.photoFile.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 4. Get Public URL
    const { data: urlData } = supabase.storage
      .from('team-members')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      // Cleanup file if URL retrieval fails
      await supabase.storage.from('team-members').remove([filePath]);
      throw new Error('Failed to retrieve public URL for uploaded photo.');
    }

    const publicUrl = urlData.publicUrl;

    // 5. Insert to DB
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        full_name: params.fullName,
        designation: params.designation,
        category: params.category,
        department: params.department || null,
        description: params.description || null,
        photo_path: publicUrl,
        email: params.email || null,
        phone: params.phone || null,
        linkedin_url: params.linkedinUrl || null,
        github_url: params.githubUrl || null,
        display_order: params.displayOrder ?? 0,
        is_active: params.isActive ?? true
      })
      .select()
      .single();

    if (error) {
      // Cleanup file if DB insert fails
      await supabase.storage.from('team-members').remove([filePath]);
      throw error;
    }

    return data;
  },

  // Update an existing member
  async updateTeamMember(
    id: string,
    params: {
      fullName: string;
      designation: string;
      category: 'hod' | 'oia' | 'placement_coordinator' | 'ssra';
      department?: string | null;
      description?: string | null;
      email?: string | null;
      phone?: string | null;
      linkedinUrl?: string | null;
      githubUrl?: string | null;
      displayOrder?: number;
      isActive?: boolean;
      newPhotoFile?: File | null;
      oldPhotoUrl?: string;
    }
  ): Promise<TeamMember> {
    let finalPhotoUrl = params.oldPhotoUrl || '';
    let newFilePathToCleanup: string | null = null;

    // 1. Handle new photo upload if provided
    if (params.newPhotoFile) {
      let uploadBlob: Blob = params.newPhotoFile;
      const fileExt = params.newPhotoFile.name.split('.').pop() || 'jpg';
      if (params.newPhotoFile.type.startsWith('image/')) {
        try {
          uploadBlob = await this.compressImage(params.newPhotoFile);
        } catch (err) {
          console.warn('Image compression failed:', err);
        }
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-members')
        .upload(filePath, uploadBlob, {
          contentType: params.newPhotoFile.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('team-members')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        await supabase.storage.from('team-members').remove([filePath]);
        throw new Error('Failed to retrieve public URL for uploaded photo.');
      }

      finalPhotoUrl = urlData.publicUrl;
      newFilePathToCleanup = filePath;
    }

    // 2. Perform DB Update
    const { data, error } = await supabase
      .from('team_members')
      .update({
        full_name: params.fullName,
        designation: params.designation,
        category: params.category,
        department: params.department || null,
        description: params.description || null,
        photo_path: finalPhotoUrl,
        email: params.email || null,
        phone: params.phone || null,
        linkedin_url: params.linkedinUrl || null,
        github_url: params.githubUrl || null,
        display_order: params.displayOrder ?? 0,
        is_active: params.isActive ?? true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Cleanup new file if db update fails
      if (newFilePathToCleanup) {
        await supabase.storage.from('team-members').remove([newFilePathToCleanup]);
      }
      throw error;
    }

    // 3. Remove old photo if a new one was successfully uploaded
    if (params.newPhotoFile && params.oldPhotoUrl) {
      try {
        const parts = params.oldPhotoUrl.split('/team-members/');
        const oldFilePath = parts.length > 1 ? parts[1] : null;
        if (oldFilePath) {
          await supabase.storage.from('team-members').remove([oldFilePath]);
        }
      } catch (err) {
        console.warn('Failed to cleanup old photo from storage:', err);
      }
    }

    return data;
  },

  // Delete a member
  async deleteTeamMember(id: string, photoUrl: string): Promise<void> {
    // 1. Delete from public.team_members
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // 2. Delete the associated file from Supabase Storage
    if (photoUrl) {
      try {
        const parts = photoUrl.split('/team-members/');
        const filePath = parts.length > 1 ? parts[1] : null;
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('team-members')
            .remove([filePath]);
          if (storageError) {
            console.warn('Failed to delete team member image from storage:', storageError.message);
          }
        }
      } catch (err) {
        console.warn('Failed to resolve photo path for deletion:', err);
      }
    }
  },

  // Toggle active status
  async toggleMemberActive(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  // Update display order
  async updateDisplayOrder(id: string, display_order: number): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .update({ display_order, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
};
