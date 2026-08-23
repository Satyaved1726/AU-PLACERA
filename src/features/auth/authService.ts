import { supabase } from '../../lib/supabase';
import type { UserProfile } from '../../types';

export const authService = {
  // Sign in logic
  async signIn(email: string, pass: string): Promise<{ error: string | null; user?: any; profile?: UserProfile }> {
    const formattedEmail = email.toLowerCase().trim();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: pass
      });

      if (error) {
        return { error: error.message };
      }

      if (import.meta.env.DEV) {
        console.log('[AUTH] session user id:', data.user.id);
        console.log('[AUTH] profile query user id:', data.user.id);
      }

      // Fetch user profile row
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (import.meta.env.DEV) {
        console.log('[AUTH] profile found:', !!profile);
        console.log('[AUTH] profile error:', profileError ? JSON.stringify(profileError) : 'none');
      }

      if (profileError) {
        console.error('[AUTH] Profile query failed:', profileError);
        return { error: `Profile query failed: ${profileError.message}` };
      }

      if (!profile) {
        console.error('[AUTH] Profile does not exist for user:', data.user.id);
        return { error: 'Your account is authenticated, but your profile is not configured.' };
      }

      if (import.meta.env.DEV) {
        console.log('[AUTH] Profile role:', profile.role);
      }
      return { error: null, user: data.user, profile };
    } catch (err: any) {
      return { error: err.message || 'Connection error. Please try again.' };
    }
  },

  // Sign up logic
  async signUp(
    email: string, 
    pass: string, 
    fullName: string, 
    rollNumber: string, 
    section: string, 
    year: number, 
    batch: string
  ): Promise<{ error: string | null; user?: any; profile?: UserProfile }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: pass,
        options: {
          data: {
            full_name: fullName,
            roll_number: rollNumber,
            section: section,
            year: year,
            batch: batch,
            role: 'student',
            oia_eligible: false
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'Signup failed. Please try again.' };
      }

      // If email confirmation is disabled, user is immediately logged in & profile is created via DB trigger
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      return { error: null, user: data.user, profile: profile || undefined };
    } catch (err: any) {
      return { error: err.message || 'Registration failed. Please try again.' };
    }
  },

  // Reset password request
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/login`
      });
      return { error: error ? error.message : null };
    } catch (err: any) {
      return { error: err.message || 'Password reset request failed.' };
    }
  },

  // Retrieve current active session and profile
  async getCurrentSession(): Promise<{ user: any | null; profile: UserProfile | null }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return { user: null, profile: null };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[AUTH] Session profile query failed:', profileError);
        return { user: session.user, profile: null };
      }

      return { user: session.user, profile: profile || null };
    } catch (err) {
      return { user: null, profile: null };
    }
  },

  // Log out session
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  // Roster fetching (student role profiles only)
  async getAllStudents(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Roster OIA toggle updater
  async updateStudentOia(studentId: string, oiaEligible: boolean): Promise<UserProfile> {
    if (import.meta.env.DEV) {
      console.log('[OIA] Updating student:');
      console.log('[OIA] Student ID:', studentId);
      console.log('[OIA] New eligibility:', oiaEligible);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        oia_eligible: oiaEligible,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)
      .select();

    if (import.meta.env.DEV) {
      console.log('[OIA] Supabase update result:', { data, error });
    }

    if (error) {
      console.error('[OIA] Supabase update error:', error);
      throw new Error(error.message || 'Database update failed');
    }

    if (!data || data.length === 0) {
      console.error('[OIA] Update failed - 0 rows affected. Likely RLS policy restriction.');
      throw new Error('Access Denied: You do not have permission to update student profiles. Please ensure that Migration 16 has been run on your Supabase Database.');
    }

    // Verify the updated row by fetching it again
    const { data: verifiedData, error: verifyError } = await supabase
      .from('profiles')
      .select('id, oia_eligible')
      .eq('id', studentId);

    if (import.meta.env.DEV) {
      console.log('[OIA] Database eligibility after update:', verifiedData);
    }

    if (verifyError) {
      throw new Error(`Verification query failed: ${verifyError.message}`);
    }

    if (!verifiedData || verifiedData.length === 0) {
      throw new Error('Verification query returned no records.');
    }

    const verifiedRow = verifiedData[0];
    if (verifiedRow.oia_eligible !== oiaEligible) {
      throw new Error(`Database state mismatch: Expected oia_eligible=${oiaEligible} but got ${verifiedRow.oia_eligible}`);
    }

    return data[0];
  }
};

export default authService;
