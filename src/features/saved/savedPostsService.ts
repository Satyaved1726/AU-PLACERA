import { supabase } from '../../lib/supabase';
import type { SavedPost, Post } from '../../types';

export const savedPostsService = {
  // 1. Save a post
  async savePost(postId: string, studentId: string): Promise<SavedPost> {
    const { data, error } = await supabase
      .from('saved_posts')
      .insert({ post_id: postId, student_id: studentId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 2. Remove saved post
  async unsavePost(postId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('post_id', postId)
      .eq('student_id', studentId);

    if (error) throw error;
  },

  // 3. Get all saved posts for a student (full cards)
  async getSavedPosts(studentId: string): Promise<Post[]> {
    // Fetch saved_posts joining posts table
    const { data, error } = await supabase
      .from('saved_posts')
      .select(`
        post_id,
        posts (
          id,
          original_content,
          post_type,
          company_name,
          opportunity_title,
          is_top_priority,
          created_by,
          created_at,
          updated_at,
          is_active
        )
      `)
      .eq('student_id', studentId)
      .order('saved_at', { ascending: false });

    if (error) throw error;

    // Extract raw posts from joined selection
    return (data || [])
      .map((row: any) => row.posts)
      .filter((post: any): post is Post => !!post && post.is_active);
  }
};

export default savedPostsService;
