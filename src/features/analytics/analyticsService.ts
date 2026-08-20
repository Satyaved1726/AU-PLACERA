import { supabase } from '../../lib/supabase';
import type { Registration, Post, UserProfile } from '../../types';

export interface AnalyticsDataPayload {
  students: UserProfile[];
  posts: Post[];
  registrations: Registration[];
}

export const analyticsService = {
  /**
   * Fetches all students, active/inactive opportunity posts, and registration records
   * in a single batch of lightweight queries.
   */
  async getAnalyticsData(): Promise<AnalyticsDataPayload> {
    // 1. Fetch all student profiles
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (studentsError) throw studentsError;

    // 2. Fetch all opportunity and OIA posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('post_type', ['opportunity', 'oia'])
      .order('created_at', { ascending: false });

    if (postsError) throw postsError;

    // 3. Fetch all registrations
    const { data: registrations, error: regsError } = await supabase
      .from('registrations')
      .select('*')
      .order('registered_at', { ascending: false });

    if (regsError) throw regsError;

    return {
      students: students || [],
      posts: posts || [],
      registrations: registrations || []
    };
  }
};

export default analyticsService;
