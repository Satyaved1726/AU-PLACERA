import { supabase } from '../../lib/supabase';
import type { Registration } from '../../types';

export const registrationsService = {
  // 1. Mark student as registered for a post
  async registerForPost(postId: string, studentId: string): Promise<Registration> {
    const { data, error } = await supabase
      .from('registrations')
      .insert({ post_id: postId, student_id: studentId })
      .select()
      .single();

    if (error) {
      // If student is already registered, raise appropriate error message
      if (error.code === '23505') {
        throw new Error('Already registered.');
      }
      throw error;
    }
    return data;
  },

  // 2. Fetch registrations for a specific student (student profile page)
  async getMyRegistrations(studentId: string): Promise<Registration[]> {
    // Join posts table to fetch company details
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        student_id,
        post_id,
        registered_at,
        posts (
          company_name,
          opportunity_title
        )
      `)
      .eq('student_id', studentId)
      .order('registered_at', { ascending: false });

    if (error) throw error;

    // Map joined records to flat interface
    return (data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      post_id: row.post_id,
      registered_at: row.registered_at,
      company_name: row.posts?.company_name || undefined,
      opportunity_title: row.posts?.opportunity_title || undefined
    }));
  },

  // 3. Fetch all registrations for a specific post (admin view)
  async getRegistrationsByPost(postId: string): Promise<Registration[]> {
    // Join profiles table to fetch student details
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        student_id,
        post_id,
        registered_at,
        profiles (
          full_name,
          roll_number,
          section,
          year,
          email,
          phone,
          branch,
          batch
        )
      `)
      .eq('post_id', postId)
      .order('registered_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      post_id: row.post_id,
      registered_at: row.registered_at,
      student_name: row.profiles?.full_name || 'N/A',
      roll_number: row.profiles?.roll_number || 'N/A',
      section: row.profiles?.section || 'N/A',
      year: row.profiles?.year || undefined,
      email: row.profiles?.email || 'N/A',
      phone: row.profiles?.phone || 'N/A',
      department: row.profiles?.branch || 'AIML',
      branch: row.profiles?.branch || 'N/A',
      batch: row.profiles?.batch || 'N/A'
    }));
  }
};

export default registrationsService;
