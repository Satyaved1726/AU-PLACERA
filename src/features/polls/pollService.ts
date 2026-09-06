import { supabase } from '../../lib/supabase';
import type {
  Poll,
  PollOption,
  PollAudience,
  PollWithDetails,
  StudentPollVote,
  PollAnalyticsSummary,
  OptionVoteCount,
  SectionAnalytics,
  StudentResponseRow,
  NonResponderRow,
  CreatePollPayload,
  UserProfile
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
   * Fetches active and closed polls that are targeted to the student's branch/batch/section.
   * Also attaches the current student's vote if they have already voted.
   */
  async getStudentPolls(studentProfile: UserProfile): Promise<PollWithDetails[]> {
    // 1. Fetch polls that are active or closed
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select(`
        *,
        profiles:created_by (full_name, role, email)
      `)
      .in('status', ['active', 'closed'])
      .order('created_at', { ascending: false });

    if (pollsError) throw pollsError;
    if (!polls || polls.length === 0) return [];

    const pollIds = polls.map(p => p.id);

    // 2. Fetch audience & options for these polls
    const [audienceRes, optionsRes, responsesRes] = await Promise.all([
      supabase.from('poll_audience').select('*').in('poll_id', pollIds),
      supabase.from('poll_options').select('*').in('poll_id', pollIds).order('option_order', { ascending: true }),
      supabase
        .from('poll_responses')
        .select(`
          id,
          poll_id,
          student_id,
          responded_at,
          poll_response_options (option_id)
        `)
        .eq('student_id', studentProfile.id)
        .in('poll_id', pollIds)
    ]);

    if (audienceRes.error) throw audienceRes.error;
    if (optionsRes.error) throw optionsRes.error;
    if (responsesRes.error) throw responsesRes.error;

    const audienceByPoll = (audienceRes.data || []).reduce<Record<string, PollAudience[]>>((acc, aud) => {
      if (!acc[aud.poll_id]) acc[aud.poll_id] = [];
      acc[aud.poll_id].push(aud);
      return acc;
    }, {});

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
        responded_at: resp.responded_at
      };
      return acc;
    }, {});

    // Filter polls matching student profile:
    // Department must match student's branch (or 'ALL')
    // Batch must match student's batch (or 'ALL')
    // Section must match student's section (or 'ALL')
    const matchingPolls: PollWithDetails[] = [];

    for (const p of polls) {
      const audienceList = audienceByPoll[p.id] || [];
      const isTargeted = audienceList.some(aud => {
        const deptMatch = aud.department === 'ALL' || aud.department === studentProfile.branch;
        const batchMatch = aud.batch === 'ALL' || aud.batch === studentProfile.batch;
        const secMatch = aud.section === 'ALL' || aud.section === studentProfile.section;
        return deptMatch && batchMatch && secMatch;
      });

      if (isTargeted) {
        // Auto-detect expired poll: if end_date has passed, treat as closed
        const isExpired = p.end_date ? new Date(p.end_date).getTime() <= Date.now() : false;
        const computedStatus = isExpired && p.status === 'active' ? 'closed' : p.status;

        matchingPolls.push({
          ...p,
          status: computedStatus,
          options: optionsByPoll[p.id] || [],
          audience: audienceList,
          user_vote: votesByPoll[p.id] || null
        });
      }
    }

    return matchingPolls;
  },

  /**
   * Submit a student's response to a poll.
   * Database constraint UNIQUE(poll_id, student_id) ensures one response per student.
   */
  async submitVote(pollId: string, studentId: string, optionIds: string[]): Promise<StudentPollVote> {
    if (!optionIds || optionIds.length === 0) {
      throw new Error('Please select at least one option.');
    }

    // Insert response record
    const { data: responseData, error: respError } = await supabase
      .from('poll_responses')
      .insert({
        poll_id: pollId,
        student_id: studentId,
        responded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (respError) {
      if (respError.code === '23505') {
        throw new Error('You have already submitted a response for this poll.');
      }
      throw respError;
    }

    // Insert response options
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
      responded_at: responseData.responded_at
    };
  },

  /**
   * Update an existing response if the poll allows changes and is still active.
   */
  async updateVote(responseId: string, optionIds: string[]): Promise<StudentPollVote> {
    if (!optionIds || optionIds.length === 0) {
      throw new Error('Please select at least one option.');
    }

    // Delete existing response options
    const { error: delError } = await supabase
      .from('poll_response_options')
      .delete()
      .eq('response_id', responseId);

    if (delError) throw delError;

    // Insert new response options
    const optionPayload = optionIds.map(optId => ({
      response_id: responseId,
      option_id: optId
    }));

    const { error: insError } = await supabase
      .from('poll_response_options')
      .insert(optionPayload);

    if (insError) throw insError;

    // Update poll_responses updated_at
    const now = new Date().toISOString();
    const { data: updatedResp, error: updateError } = await supabase
      .from('poll_responses')
      .update({ updated_at: now })
      .eq('id', responseId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      response_id: responseId,
      option_ids: optionIds,
      responded_at: updatedResp.responded_at
    };
  },

  // --------------------------------------------------------------------------
  // 2. ADMIN METHODS
  // --------------------------------------------------------------------------

  /**
   * Fetch all polls for admin dashboard, with response counts and creator metadata.
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

    const [audienceRes, optionsRes, responsesCountRes] = await Promise.all([
      supabase.from('poll_audience').select('*').in('poll_id', pollIds),
      supabase.from('poll_options').select('*').in('poll_id', pollIds).order('option_order', { ascending: true }),
      supabase.from('poll_responses').select('id, poll_id')
    ]);

    if (audienceRes.error) throw audienceRes.error;
    if (optionsRes.error) throw optionsRes.error;
    if (responsesCountRes.error) throw responsesCountRes.error;

    const audienceByPoll = (audienceRes.data || []).reduce<Record<string, PollAudience[]>>((acc, aud) => {
      if (!acc[aud.poll_id]) acc[aud.poll_id] = [];
      acc[aud.poll_id].push(aud);
      return acc;
    }, {});

    const optionsByPoll = (optionsRes.data || []).reduce<Record<string, PollOption[]>>((acc, opt) => {
      if (!acc[opt.poll_id]) acc[opt.poll_id] = [];
      acc[opt.poll_id].push(opt);
      return acc;
    }, {});

    const countsByPoll = (responsesCountRes.data || []).reduce<Record<string, number>>((acc, resp) => {
      acc[resp.poll_id] = (acc[resp.poll_id] || 0) + 1;
      return acc;
    }, {});

    return polls.map(p => {
      const isExpired = p.end_date ? new Date(p.end_date).getTime() <= Date.now() : false;
      const computedStatus = isExpired && p.status === 'active' ? 'closed' : p.status;
      return {
        ...p,
        status: computedStatus,
        options: optionsByPoll[p.id] || [],
        audience: audienceByPoll[p.id] || [],
        total_responses: countsByPoll[p.id] || 0
      };
    });
  },

  /**
   * Fetch single poll by ID with options, audience, and creator metadata.
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

    const [audienceRes, optionsRes, userVoteRes, respCountRes] = await Promise.all([
      supabase.from('poll_audience').select('*').eq('poll_id', pollId),
      supabase.from('poll_options').select('*').eq('poll_id', pollId).order('option_order', { ascending: true }),
      studentId
        ? supabase
            .from('poll_responses')
            .select(`
              id,
              poll_id,
              student_id,
              responded_at,
              poll_response_options (option_id)
            `)
            .eq('poll_id', pollId)
            .eq('student_id', studentId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('poll_responses').select('id', { count: 'exact', head: true }).eq('poll_id', pollId)
    ]);

    if (audienceRes.error) throw audienceRes.error;
    if (optionsRes.error) throw optionsRes.error;
    if (userVoteRes.error) throw userVoteRes.error;

    let userVote: StudentPollVote | null = null;
    if (userVoteRes.data) {
      const optIds = ((userVoteRes.data as any).poll_response_options || []).map((o: any) => o.option_id);
      userVote = {
        response_id: (userVoteRes.data as any).id,
        option_ids: optIds,
        responded_at: (userVoteRes.data as any).responded_at
      };
    }

    const isExpired = poll.end_date ? new Date(poll.end_date).getTime() <= Date.now() : false;
    const computedStatus = isExpired && poll.status === 'active' ? 'closed' : poll.status;

    return {
      ...poll,
      status: computedStatus,
      options: optionsRes.data || [],
      audience: audienceRes.data || [],
      user_vote: userVote,
      total_responses: respCountRes.count || 0
    };
  },

  /**
   * Create a new poll with audience targets and options.
   */
  async createPoll(payload: CreatePollPayload, adminId: string): Promise<Poll> {
    if (!payload.question.trim()) {
      throw new Error('Poll question is required.');
    }
    if (!payload.options || payload.options.length < 2) {
      throw new Error('A minimum of 2 options are required.');
    }
    const cleanOptions = payload.options.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      throw new Error('Options cannot be empty. Please enter at least 2 non-empty options.');
    }
    const uniqueOptions = new Set(cleanOptions.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== cleanOptions.length) {
      throw new Error('Duplicate options are not allowed.');
    }
    if (payload.start_date && payload.end_date) {
      if (new Date(payload.end_date).getTime() <= new Date(payload.start_date).getTime()) {
        throw new Error('End date must be after start date.');
      }
    }

    // 1. Insert poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        question: payload.question.trim(),
        description: payload.description?.trim() || null,
        poll_type: payload.poll_type,
        status: payload.status,
        created_by: adminId,
        department: payload.department || 'AIML',
        batch: payload.batch || '2023-2027',
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        allow_response_change: payload.allow_response_change
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

    // 3. Insert audience targets
    const sections = payload.sections && payload.sections.length > 0 ? payload.sections : ['ALL'];
    const audienceRows = sections.map(sec => ({
      poll_id: poll.id,
      department: payload.department || 'AIML',
      batch: payload.batch || '2023-2027',
      section: sec
    }));

    const { error: audError } = await supabase.from('poll_audience').insert(audienceRows);
    if (audError) throw audError;

    return poll;
  },

  /**
   * Update poll metadata, options, or audience targets.
   */
  async updatePoll(pollId: string, payload: Partial<CreatePollPayload>): Promise<Poll> {
    const updateFields: any = { updated_at: new Date().toISOString() };
    if (payload.question !== undefined) updateFields.question = payload.question.trim();
    if (payload.description !== undefined) updateFields.description = payload.description?.trim() || null;
    if (payload.poll_type !== undefined) updateFields.poll_type = payload.poll_type;
    if (payload.status !== undefined) updateFields.status = payload.status;
    if (payload.start_date !== undefined) updateFields.start_date = payload.start_date || null;
    if (payload.end_date !== undefined) updateFields.end_date = payload.end_date || null;
    if (payload.allow_response_change !== undefined) updateFields.allow_response_change = payload.allow_response_change;

    const { data: updatedPoll, error: pollError } = await supabase
      .from('polls')
      .update(updateFields)
      .eq('id', pollId)
      .select()
      .single();

    if (pollError) throw pollError;

    // If options are provided and poll has no responses yet, update options
    if (payload.options && payload.options.length >= 2) {
      const cleanOptions = payload.options.map(o => o.trim()).filter(Boolean);
      await supabase.from('poll_options').delete().eq('poll_id', pollId);
      const optionRows = cleanOptions.map((optText, idx) => ({
        poll_id: pollId,
        option_text: optText,
        option_order: idx
      }));
      await supabase.from('poll_options').insert(optionRows);
    }

    // If sections provided, update audience
    if (payload.sections && payload.sections.length > 0) {
      await supabase.from('poll_audience').delete().eq('poll_id', pollId);
      const audienceRows = payload.sections.map(sec => ({
        poll_id: pollId,
        department: payload.department || 'AIML',
        batch: payload.batch || '2023-2027',
        section: sec
      }));
      await supabase.from('poll_audience').insert(audienceRows);
    }

    return updatedPoll;
  },

  /**
   * Close a poll manually so no further responses are accepted.
   */
  async closePoll(pollId: string): Promise<void> {
    const { error } = await supabase
      .from('polls')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', pollId);

    if (error) throw error;
  },

  /**
   * Delete a poll and its associated data (cascading).
   */
  async deletePoll(pollId: string): Promise<void> {
    const { error } = await supabase.from('polls').delete().eq('id', pollId);
    if (error) throw error;
  },

  // --------------------------------------------------------------------------
  // 3. ANALYTICS & REPORTING
  // --------------------------------------------------------------------------

  /**
   * Calculates overall, option-wise, section-wise, student-wise, and non-responder analytics.
   */
  async getPollAnalytics(pollId: string): Promise<PollAnalyticsSummary> {
    // 1. Fetch the poll with options and audience
    const poll = await this.getPollById(pollId);

    // 2. Fetch all student profiles matching the target audience
    const { data: allStudents, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name, roll_number, email, section, branch, batch, role')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (studentsError) throw studentsError;

    // Filter eligible students based on poll audience
    const isAllSections = poll.audience.some(a => a.section === 'ALL');
    const targetedSections = new Set(poll.audience.map(a => a.section));

    const eligibleStudents = (allStudents || []).filter(student => {
      // Must match branch/department
      const branchMatch = poll.audience.some(a => a.department === 'ALL' || a.department === student.branch);
      // Must match batch
      const batchMatch = poll.audience.some(a => a.batch === 'ALL' || a.batch === student.batch);
      // Must match section
      const sectionMatch = isAllSections || (student.section && targetedSections.has(student.section));

      return branchMatch && batchMatch && sectionMatch;
    });

    const totalEligible = eligibleStudents.length;

    // 3. Fetch all responses for this poll with profiles and chosen options
    const { data: responses, error: respError } = await supabase
      .from('poll_responses')
      .select(`
        id,
        poll_id,
        student_id,
        responded_at,
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
      .order('responded_at', { ascending: false });

    if (respError) throw respError;

    const totalResponses = responses?.length || 0;
    const notResponded = Math.max(0, totalEligible - totalResponses);
    const responseRate = totalEligible > 0 ? Math.round((totalResponses / totalEligible) * 1000) / 10 : 0;

    // 4. Option-wise breakdown
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
      const percentage = totalResponses > 0 ? Math.round((votes / totalResponses) * 1000) / 10 : 0;
      return {
        option_id: opt.id,
        option_text: opt.option_text,
        votes,
        percentage
      };
    });

    // 5. Section-wise breakdown (Sections A, B, C, D, E, F)
    const sectionsToAnalyze = isAllSections
      ? ALL_SECTIONS
      : ALL_SECTIONS.filter(sec => targetedSections.has(sec));

    const sectionBreakdown: SectionAnalytics[] = sectionsToAnalyze.map(sec => {
      const secEligible = eligibleStudents.filter(s => s.section === sec).length;
      
      const secResponses = (responses || []).filter(r => (r as any).profiles?.section === sec);
      const secTotalResponses = secResponses.length;
      const secResponseRate = secEligible > 0 ? Math.round((secTotalResponses / secEligible) * 1000) / 10 : 0;

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
        total_responses: secTotalResponses,
        eligible_students: secEligible,
        response_rate: secResponseRate
      };
    });

    // 6. Student-wise responses table
    const studentResponses: StudentResponseRow[] = (responses || []).map(r => {
      const prof = (r as any).profiles || {};
      const selectedOpts = (r as any).poll_response_options || [];
      const firstOpt = selectedOpts[0]?.poll_options || {};

      return {
        student_id: r.student_id,
        roll_number: prof.roll_number || 'N/A',
        student_name: prof.full_name || 'Student User',
        section: formatSectionLabel(prof.section),
        option_text: selectedOpts.map((so: any) => so.poll_options?.option_text || 'Unknown').join(', ') || 'N/A',
        option_id: firstOpt.id || '',
        responded_at: r.responded_at
      };
    });

    // 7. Non-responders list (Target Audience MINUS Responded Students)
    const respondedStudentIds = new Set((responses || []).map(r => r.student_id));
    const nonResponders: NonResponderRow[] = eligibleStudents
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
      total_eligible: totalEligible,
      total_responses: totalResponses,
      not_responded: notResponded,
      response_rate: responseRate,
      option_breakdown: optionBreakdown,
      section_breakdown: sectionBreakdown,
      student_responses: studentResponses,
      non_responders: nonResponders
    };
  }
};
