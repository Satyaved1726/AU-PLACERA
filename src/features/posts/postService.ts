import { supabase } from '../../lib/supabase';
import type { Post } from '../../types';

export const postService = {
  // Fetch active posts for Student noticeboard (ordered by priority, then date)
  async getActivePosts(oiaEligible: boolean = false): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select('*, profiles:created_by (full_name, role, email)')
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
      .select('*, profiles:created_by (full_name, role, email)')
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
      .select('*, profiles:created_by (full_name, role, email)')
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
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

export default postService;
