import { supabase } from '../../lib/supabase';
import type {
  Poll,
  PollOption,
  PollWithDetails,
  StudentPollVote,
  PollAnalyticsSummary,
  OptionVoteCount,
  SectionAnalytics,
  StudentResponseRow,
  NonResponderRow,
  CreatePollPayload
} from '../../types';

export const ALL_SECTIONS = ['AIML-A', 'AIML-B', 'AIML-C', 'AIML-D', 'AIML-E', 'AIML-F'] as const;

export const formatSectionLabel = (section: string): string => {
  if (!section) return 'Unassigned';
  if (section === 'ALL') return 'All Sections (A–F)';
  return section.replace('AIML-', 'Section ');
};

export const pollService = {
  // --------------------------------------------------------------------------
  // 1. STUDENT METHODS
  // --------------------------------------------------------------------------

  /**
   * Fetches all polls and attaches the current student's vote if already cast.
   */
  async getStudentPolls(studentId: string): Promise<PollWithDetails[]> {
    // 1. Fetch all polls
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select(`
        *,
        profiles:created_by (full_name, role, email)
      `)
      .order('created_at', { ascending: false });

    if (pollsError) throw pollsError;
    if (!polls || polls.length === 0) return [];

    const pollIds = polls.map(p => p.id);

    // 2. Fetch options and current student's responses
    const [optionsRes, responsesRes] = await Promise.all([
      supabase.from('poll_options').select('*').in('poll_id', pollIds).order('option_order', { ascending: true }),
      supabase
        .from('poll_responses')
        .select(`
          id,
          poll_id,
          student_id,
          voted_at,
          poll_response_options (option_id)
        `)
        .eq('student_id', studentId)
        .in('poll_id', pollIds)
    ]);

    if (optionsRes.error) throw optionsRes.error;
    if (responsesRes.error) throw responsesRes.error;

    const optionsByPoll = (optionsRes.data || []).reduce<Record<string, PollOption[]>>((acc, opt) => {
      if (!acc[opt.poll_id]) acc[opt.poll_id] = [];
      acc[opt.poll_id].push(opt);
      return acc;
    }, {});

    const votesByPoll = (responsesRes.data || []).reduce<Record<string, StudentPollVote>>((acc, resp: any) => {
      const optionIds = (resp.poll_response_options || []).map((o: any) => o.option_id);
      acc[resp.poll_id] = {
        response_id: resp.id,
        option_ids: optionIds,
        voted_at: resp.voted_at
      };
      return acc;
    }, {});

    return polls.map(p => ({
      ...p,
      options: optionsByPoll[p.id] || [],
      user_vote: votesByPoll[p.id] || null
    }));
  },

  /**
   * Submit a student's vote.
   * If allow_multiple_answers is false, strictly one option must be selected.
   * Database constraint UNIQUE(poll_id, student_id) ensures one vote per student.
   */
  async submitVote(pollId: string, studentId: string, optionIds: string[]): Promise<StudentPollVote> {
    if (!optionIds || optionIds.length === 0) {
      throw new Error('Please select at least one option to vote.');
    }

    // Verify poll configuration
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('allow_multiple_answers')
      .eq('id', pollId)
      .single();

    if (pollError) throw pollError;
    if (!poll) throw new Error('Poll not found');

    if (!poll.allow_multiple_answers && optionIds.length > 1) {
      throw new Error('This poll allows only a single answer.');
    }

    // Insert response record
    const now = new Date().toISOString();
    const { data: responseData, error: respError } = await supabase
      .from('poll_responses')
      .insert({
        poll_id: pollId,
        student_id: studentId,
        voted_at: now
      })
      .select()
      .single();

    if (respError) {
      if (respError.code === '23505') {
        throw new Error('Your vote has already been recorded for this poll.');
      }
      throw respError;
    }

    // Insert chosen response option(s)
    const optionPayload = optionIds.map(optId => ({
      response_id: responseData.id,
      option_id: optId
    }));

    const { error: optError } = await supabase
      .from('poll_response_options')
      .insert(optionPayload);

    if (optError) throw optError;

    return {
      response_id: responseData.id,
      option_ids: optionIds,
      voted_at: responseData.voted_at
    };
  },

  // --------------------------------------------------------------------------
  // 2. ADMIN METHODS
  // --------------------------------------------------------------------------

  /**
   * Fetch all polls for admin dashboard, with voter count.
   */
  async getAllPolls(): Promise<PollWithDetails[]> {
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select(`
        *,
        profiles:created_by (full_name, role, email)
      `)
      .order('created_at', { ascending: false });

    if (pollsError) throw pollsError;
    if (!polls || polls.length === 0) return [];

    const pollIds = polls.map(p => p.id);

    const [optionsRes, responsesCountRes] = await Promise.all([
      supabase.from('poll_options').select('*').in('poll_id', pollIds).order('option_order', { ascending: true }),
      supabase.from('poll_responses').select('id, poll_id')
    ]);

    if (optionsRes.error) throw optionsRes.error;
    if (responsesCountRes.error) throw responsesCountRes.error;

    const optionsByPoll = (optionsRes.data || []).reduce<Record<string, PollOption[]>>((acc, opt) => {
      if (!acc[opt.poll_id]) acc[opt.poll_id] = [];
      acc[opt.poll_id].push(opt);
      return acc;
    }, {});

    const countsByPoll = (responsesCountRes.data || []).reduce<Record<string, number>>((acc, resp) => {
      acc[resp.poll_id] = (acc[resp.poll_id] || 0) + 1;
      return acc;
    }, {});

    return polls.map(p => ({
      ...p,
      options: optionsByPoll[p.id] || [],
      total_voted: countsByPoll[p.id] || 0
    }));
  },

  /**
   * Fetch single poll by ID with options and total voters.
   */
  async getPollById(pollId: string, studentId?: string): Promise<PollWithDetails> {
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select(`
        *,
        profiles:created_by (full_name, role, email)
      `)
      .eq('id', pollId)
      .single();

    if (pollError) throw pollError;
    if (!poll) throw new Error('Poll not found');

    const [optionsRes, userVoteRes, respCountRes] = await Promise.all([
      supabase.from('poll_options').select('*').eq('poll_id', pollId).order('option_order', { ascending: true }),
      studentId
        ? supabase
            .from('poll_responses')
            .select(`
              id,
              poll_id,
              student_id,
              voted_at,
              poll_response_options (option_id)
            `)
            .eq('poll_id', pollId)
            .eq('student_id', studentId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('poll_responses').select('id', { count: 'exact', head: true }).eq('poll_id', pollId)
    ]);

    if (optionsRes.error) throw optionsRes.error;
    if (userVoteRes.error) throw userVoteRes.error;

    let userVote: StudentPollVote | null = null;
    if (userVoteRes.data) {
      const optIds = ((userVoteRes.data as any).poll_response_options || []).map((o: any) => o.option_id);
      userVote = {
        response_id: (userVoteRes.data as any).id,
        option_ids: optIds,
        voted_at: (userVoteRes.data as any).voted_at
      };
    }

    return {
      ...poll,
      options: optionsRes.data || [],
      user_vote: userVote,
      total_voted: respCountRes.count || 0
    };
  },

  /**
   * Create a new poll in WhatsApp style: Question + Options + Allow Multiple Answers.
   * No presets, no default options, no target section pickers.
   */
  async createPoll(payload: CreatePollPayload, adminId: string): Promise<Poll> {
    if (!payload.question.trim()) {
      throw new Error('Please enter a poll question.');
    }
    if (!payload.options || payload.options.length < 2) {
      throw new Error('Please enter at least 2 options.');
    }
    const cleanOptions = payload.options.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      throw new Error('Options cannot be blank. Please enter at least 2 non-empty options.');
    }
    const uniqueOptions = new Set(cleanOptions.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== cleanOptions.length) {
      throw new Error('Duplicate options detected. Each option must be distinct.');
    }

    // 1. Insert poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        question: payload.question.trim(),
        allow_multiple_answers: payload.allow_multiple_answers ?? false,
        created_by: adminId
      })
      .select()
      .single();

    if (pollError) throw pollError;

    // 2. Insert options
    const optionRows = cleanOptions.map((optText, idx) => ({
      poll_id: poll.id,
      option_text: optText,
      option_order: idx
    }));

    const { error: optError } = await supabase.from('poll_options').insert(optionRows);
    if (optError) throw optError;

    return poll;
  },

  /**
   * Delete a poll and its options/responses.
   */
  async deletePoll(pollId: string): Promise<void> {
    const { error } = await supabase.from('polls').delete().eq('id', pollId);
    if (error) throw error;
  },

  // --------------------------------------------------------------------------
  // 3. ADMIN RESULTS & ANALYTICS
  // --------------------------------------------------------------------------

  /**
   * Generates structured overall, option-wise, section-wise, student-wise, and non-responder analytics.
   * Automatically derives metrics from student profile records (sections A through F).
   */
  async getPollAnalytics(pollId: string): Promise<PollAnalyticsSummary> {
    // 1. Fetch poll with options
    const poll = await this.getPollById(pollId);

    // 2. Fetch all AIML student profiles from database
    const { data: allStudents, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name, roll_number, email, section, branch, batch, role')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (studentsError) throw studentsError;

    const totalStudents = allStudents?.length || 0;

    // 3. Fetch all responses with profiles and selected options
    const { data: responses, error: respError } = await supabase
      .from('poll_responses')
      .select(`
        id,
        poll_id,
        student_id,
        voted_at,
        profiles:student_id (
          id,
          full_name,
          roll_number,
          section
        ),
        poll_response_options (
          option_id,
          poll_options:option_id (
            id,
            option_text
          )
        )
      `)
      .eq('poll_id', pollId)
      .order('voted_at', { ascending: false });

    if (respError) throw respError;

    const studentsVoted = responses?.length || 0;
    const notResponded = Math.max(0, totalStudents - studentsVoted);
    const responseRate = totalStudents > 0 ? Math.round((studentsVoted / totalStudents) * 1000) / 10 : 0;

    // 4. Option-wise count & percentages
    const optionVotesMap: Record<string, number> = {};
    (poll.options || []).forEach(opt => {
      optionVotesMap[opt.id] = 0;
    });

    (responses || []).forEach(r => {
      const selectedOpts = (r as any).poll_response_options || [];
      selectedOpts.forEach((o: any) => {
        if (o.option_id && optionVotesMap[o.option_id] !== undefined) {
          optionVotesMap[o.option_id]++;
        }
      });
    });

    const optionBreakdown: OptionVoteCount[] = (poll.options || []).map(opt => {
      const votes = optionVotesMap[opt.id] || 0;
      // In multiple-answer polls, percentage reflects percentage of participating students who selected this option
      const percentage = studentsVoted > 0 ? Math.round((votes / studentsVoted) * 1000) / 10 : 0;
      return {
        option_id: opt.id,
        option_text: opt.option_text,
        votes,
        percentage
      };
    });

    // 5. Section-wise breakdown (Sections A through F)
    const sectionBreakdown: SectionAnalytics[] = ALL_SECTIONS.map(sec => {
      const secEligible = (allStudents || []).filter(s => s.section === sec).length;
      const secResponses = (responses || []).filter(r => (r as any).profiles?.section === sec);
      const secStudentsVoted = secResponses.length;
      const secResponseRate = secEligible > 0 ? Math.round((secStudentsVoted / secEligible) * 1000) / 10 : 0;

      const optCounts: Record<string, number> = {};
      (poll.options || []).forEach(opt => {
        optCounts[opt.id] = 0;
      });

      secResponses.forEach(r => {
        const selectedOpts = (r as any).poll_response_options || [];
        selectedOpts.forEach((o: any) => {
          if (o.option_id && optCounts[o.option_id] !== undefined) {
            optCounts[o.option_id]++;
          }
        });
      });

      return {
        section: sec,
        display_section: formatSectionLabel(sec),
        option_counts: optCounts,
        students_voted: secStudentsVoted,
        eligible_students: secEligible,
        response_rate: secResponseRate
      };
    });

    // 6. Student-wise responses table
    const studentResponses: StudentResponseRow[] = (responses || []).map(r => {
      const prof = (r as any).profiles || {};
      const selectedOpts = (r as any).poll_response_options || [];
      const optionTexts = selectedOpts
        .map((so: any) => so.poll_options?.option_text)
        .filter(Boolean);

      return {
        student_id: r.student_id,
        roll_number: prof.roll_number || 'N/A',
        student_name: prof.full_name || 'Student User',
        section: formatSectionLabel(prof.section),
        selected_options: optionTexts,
        voted_at: r.voted_at
      };
    });

    // 7. Non-responders list
    const respondedStudentIds = new Set((responses || []).map(r => r.student_id));
    const nonResponders: NonResponderRow[] = (allStudents || [])
      .filter(student => !respondedStudentIds.has(student.id))
      .map(student => ({
        student_id: student.id,
        roll_number: student.roll_number || 'N/A',
        student_name: student.full_name || 'Student User',
        section: formatSectionLabel(student.section || ''),
        status: 'Not Responded'
      }));

    return {
      poll,
      total_students: totalStudents,
      students_voted: studentsVoted,
      not_responded: notResponded,
      response_rate: responseRate,
      option_breakdown: optionBreakdown,
      section_breakdown: sectionBreakdown,
      student_responses: studentResponses,
      non_responders: nonResponders
    };
  }
};
