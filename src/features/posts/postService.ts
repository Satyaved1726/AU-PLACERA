import { supabase } from '../../lib/supabase';
import type { Post, PostAttachment } from '../../types';

export const postService = {
  // Fetch active posts for Student noticeboard (ordered by priority, then date)
  async getActivePosts(oiaEligible: boolean = false): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select('*, profiles:created_by (full_name, role, email), attachments:post_attachments(*)')
      .eq('is_active', true)
      .in('post_type', ['opportunity', 'announcement']);

    if (!oiaEligible) {
      // Exclude OIA-only posts for non-eligible students
      query = query.or('audience.is.null,audience.eq.general');
    }

    const { data, error } = await query
      .order('is_top_priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch active OIA posts for Student OIA noticeboard
  async getOiaPosts(): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:created_by (full_name, role, email), attachments:post_attachments(*)')
      .eq('is_active', true)
      .or('post_type.eq.oia,audience.eq.oia')
      .order('is_top_priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch all posts for Admin posts management list
  async getAdminPosts(): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:created_by (full_name, role, email), attachments:post_attachments(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create single post
  async createPost(post: Omit<Post, 'id' | 'created_at' | 'updated_at'>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Bulk create posts
  async createPosts(posts: Omit<Post, 'id' | 'created_at' | 'updated_at'>[]): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .insert(posts)
      .select();

    if (error) throw error;
    return data || [];
  },

  // Update post fields
  async updatePost(id: string, updates: Partial<Omit<Post, 'id' | 'created_at' | 'updated_at'>>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete post permanently
  async deletePost(id: string): Promise<void> {
    // 1. Fetch all associated attachments to delete them from storage
    const { data: attachments } = await supabase
      .from('post_attachments')
      .select('file_path')
      .eq('post_id', id);

    if (attachments && attachments.length > 0) {
      const paths = attachments.map(a => a.file_path);
      const { error: storageAttachmentsError } = await supabase.storage
        .from('post-attachments')
        .remove(paths);
      if (storageAttachmentsError) {
        console.error('Failed to clean up attachments from storage:', storageAttachmentsError.message);
      }
    }

    // 2. Delete from database
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Upload attachment file (to storage and insert DB record)
  async uploadAttachment(postId: string, file: File, createdBy: string): Promise<PostAttachment> {
    const fileExt = file.name.split('.').pop() || 'tmp';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    const filePath = `${postId}/${uniqueFileName}`;

    // Derive correct MIME type to comply with storage bucket constraints
    let contentType = file.type;
    const ext = fileExt.toLowerCase();
    if (!contentType || contentType === 'application/octet-stream') {
      if (ext === 'pdf') contentType = 'application/pdf';
      else if (ext === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (ext === 'xls') contentType = 'application/vnd.ms-excel';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'webp') contentType = 'image/webp';
      else contentType = 'application/octet-stream';
    }

    const { error: uploadError } = await supabase.storage
      .from('post-attachments')
      .upload(filePath, file, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Attachment upload failed: ${uploadError.message}`);
    }

    const { data, error } = await supabase
      .from('post_attachments')
      .insert({
        post_id: postId,
        file_name: file.name,
        file_path: filePath,
        file_type: contentType || 'application/octet-stream',
        file_size: file.size,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) {
      // Cleanup file if DB insert fails
      await supabase.storage.from('post-attachments').remove([filePath]);
      throw error;
    }

    return data;
  },

  // Delete attachment (removes file from storage and deletes DB record)
  async deleteAttachment(attachmentId: string, filePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from('post-attachments')
      .remove([filePath]);

    if (storageError) {
      if (import.meta.env.DEV) {
        console.warn('Failed to delete attachment from storage:', storageError.message);
      }
    }

    const { error } = await supabase
      .from('post_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) throw error;
  }
};

export default postService;
