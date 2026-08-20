import { supabase } from '../../lib/supabase';
import type { DigitalAnnouncement } from '../../types';

export const announcementsService = {
  // Fetch announcements visible to the user
  async getAnnouncements(): Promise<DigitalAnnouncement[]> {
    const { data, error } = await supabase
      .from('digital_announcements')
      .select('*, profiles:created_by (full_name, role)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Compress image helper
  compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<Blob> {
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

  // Create announcement (handles image compression + storage upload + DB insert)
  async createAnnouncement(params: {
    title: string;
    description?: string;
    imageFile: File;
    externalUrl?: string | null;
    isOia: boolean;
    createdBy: string;
  }): Promise<DigitalAnnouncement> {
    // 1. Compress only if it's an image
    let uploadBlob: Blob = params.imageFile;
    const isImage = params.imageFile.type.startsWith('image/');
    const fileExt = params.imageFile.name.split('.').pop() || 'jpg';
    
    if (isImage) {
      try {
        uploadBlob = await this.compressImage(params.imageFile);
      } catch (err) {
        console.warn('Image compression failed, using original file:', err);
      }
    }

    // 2. Generate a unique filename and path in the storage bucket
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    // 3. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('announcements')
      .upload(filePath, uploadBlob, {
        contentType: params.imageFile.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 4. Get Public URL
    const { data: urlData } = supabase.storage
      .from('announcements')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to retrieve public URL for uploaded poster.');
    }

    const publicUrl = urlData.publicUrl;

    // 5. Save metadata to database table
    const { data, error } = await supabase
      .from('digital_announcements')
      .insert({
        title: params.title,
        description: params.description || null,
        image_url: publicUrl,
        external_url: params.externalUrl || null,
        is_oia: params.isOia,
        created_by: params.createdBy
      })
      .select()
      .single();

    if (error) {
      // Cleanup the uploaded image if database insert fails
      await supabase.storage.from('announcements').remove([filePath]);
      throw error;
    }

    return data;
  },

  // Delete announcement (handles storage cleanup + DB delete)
  async deleteAnnouncement(id: string, imageUrl: string): Promise<void> {
    // 1. Get the filename/path from the imageUrl
    // Expected image URL format: http://.../storage/v1/object/public/announcements/filename.jpg
    const parts = imageUrl.split('/announcements/');
    const filePath = parts.length > 1 ? parts[1] : null;

    if (filePath) {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('announcements')
        .remove([filePath]);
      
      if (storageError) {
        console.error('Failed to delete file from storage:', storageError.message);
      }
    }

    // 2. Delete from database
    const { error } = await supabase
      .from('digital_announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

export default announcementsService;
