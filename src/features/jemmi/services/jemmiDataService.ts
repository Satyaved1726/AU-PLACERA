import { supabase } from '../../../lib/supabase';
import type { Post } from '../../posts/post.types';
import { isPriorityActive } from '../../posts/post.types';
import type { Poll } from '../../../types/poll';
import type { StudentContextData } from '../types/jemmi.types';

export interface JemmiLiveContext {
  student?: StudentContextData;
  opportunities: Post[];
  priorityPosts: Post[];
  priorityPolls: Poll[];
  recentPosts: Post[];
  activePolls: Poll[];
  myRegistrations: any[];
  savedPosts: any[];
}

export const jemmiDataService = {
  /**
   * Fetch student's profile context for eligibility & personalization
   */
  async getStudentProfile(userId: string): Promise<StudentContextData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, roll_number, branch, section, batch, cgpa, oia_eligible')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        fullName: data.full_name || 'Student',
        rollNumber: data.roll_number,
        branch: data.branch,
        section: data.section,
        batch: data.batch,
        cgpa: data.cgpa,
        oiaEligible: data.oia_eligible
      };
    } catch {
      return null;
    }
  },

  /**
   * Fetch active opportunity posts (placements/internships)
   */
  async getOpportunities(limit: number = 5): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit * 2);

      if (error || !data) return [];

      const opportunities = (data as Post[]).filter(
        (p) =>
          p.post_type === 'opportunity' ||
          (p.company_name && p.company_name.trim() !== '') ||
          (p.opportunity_title && p.opportunity_title.trim() !== '')
      );

      return opportunities.slice(0, limit);
    } catch {
      return [];
    }
  },

  /**
   * Fetch active priority posts & polls
   */
  async getPriorityItems(): Promise<{ posts: Post[]; polls: Poll[] }> {
    try {
      const [postsRes, pollsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('is_active', true)
          .eq('is_priority', true),
        supabase
          .from('polls')
          .select('*')
          .eq('is_active', true)
          .eq('is_priority', true)
      ]);

      const activePriorityPosts = ((postsRes.data || []) as Post[]).filter((p) =>
        isPriorityActive(p)
      );

      const activePriorityPolls = ((pollsRes.data || []) as Poll[]).filter((p) =>
        isPriorityActive(p)
      );

      return {
        posts: activePriorityPosts,
        polls: activePriorityPolls
      };
    } catch {
      return { posts: [], polls: [] };
    }
  },

  /**
   * Fetch recent announcements & notices for "What did I miss?"
   */
  async getRecentPosts(limit: number = 5): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data as Post[];
    } catch {
      return [];
    }
  },

  /**
   * Fetch active polls
   */
  async getActivePolls(limit: number = 5): Promise<Poll[]> {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data as Poll[];
    } catch {
      return [];
    }
  },

  /**
   * Fetch student's registered drives
   */
  async getMyRegistrations(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id,
          student_id,
          post_id,
          registered_at,
          posts (
            id,
            original_content,
            post_type,
            company_name,
            opportunity_title,
            is_priority,
            created_at
          )
        `)
        .eq('student_id', studentId)
        .order('registered_at', { ascending: false });

      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  },

  /**
   * Fetch student's saved / bookmarked posts
   */
  async getSavedPosts(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          id,
          post_id,
          created_at,
          posts (
            id,
            original_content,
            post_type,
            company_name,
            opportunity_title,
            created_at
          )
        `)
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  },

  /**
   * Assemble full student live context for comprehensive answering
   */
  async getFullStudentContext(userId: string): Promise<JemmiLiveContext> {
    const [
      student,
      opportunities,
      priorityItems,
      recentPosts,
      activePolls,
      myRegistrations,
      savedPosts
    ] = await Promise.all([
      this.getStudentProfile(userId),
      this.getOpportunities(5),
      this.getPriorityItems(),
      this.getRecentPosts(5),
      this.getActivePolls(5),
      this.getMyRegistrations(userId),
      this.getSavedPosts(userId)
    ]);

    return {
      student: student || undefined,
      opportunities,
      priorityPosts: priorityItems.posts,
      priorityPolls: priorityItems.polls,
      recentPosts,
      activePolls,
      myRegistrations,
      savedPosts
    };
  }
};
