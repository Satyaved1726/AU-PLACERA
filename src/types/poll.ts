// TypeScript definitions for AU Placera Polls System

export type PollType = 'single_choice' | 'multiple_choice';
export type PollStatus = 'draft' | 'active' | 'closed';

export interface Poll {
  id: string;
  question: string;
  description?: string | null;
  poll_type: PollType;
  status: PollStatus;
  created_by: string | null;
  department: string;
  batch: string;
  start_date?: string | null;
  end_date?: string | null;
  allow_response_change: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    role: string;
    email?: string;
  } | null;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  option_order: number;
  created_at: string;
}

export interface PollAudience {
  id: string;
  poll_id: string;
  department: string;
  batch: string;
  section: string; // 'ALL' or 'AIML-A', 'AIML-B', ...
  created_at: string;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  student_id: string;
  responded_at: string;
  updated_at: string;
}

export interface PollResponseOption {
  id: string;
  response_id: string;
  option_id: string;
  created_at: string;
}

export interface StudentPollVote {
  response_id: string;
  option_ids: string[];
  responded_at: string;
}

export interface PollWithDetails extends Poll {
  options: PollOption[];
  audience: PollAudience[];
  user_vote?: StudentPollVote | null;
  total_responses?: number;
}

export interface OptionVoteCount {
  option_id: string;
  option_text: string;
  votes: number;
  percentage: number;
}

export interface SectionAnalytics {
  section: string; // 'AIML-A'
  display_section: string; // 'Section A'
  option_counts: Record<string, number>; // option_id -> count
  total_responses: number;
  eligible_students: number;
  response_rate: number; // e.g. 74.5 (%)
}

export interface StudentResponseRow {
  student_id: string;
  roll_number: string;
  student_name: string;
  section: string;
  option_text: string;
  option_id: string;
  responded_at: string;
}

export interface NonResponderRow {
  student_id: string;
  roll_number: string;
  student_name: string;
  section: string;
  status: 'Not Responded';
}

export interface PollAnalyticsSummary {
  poll: PollWithDetails;
  total_eligible: number;
  total_responses: number;
  not_responded: number;
  response_rate: number;
  option_breakdown: OptionVoteCount[];
  section_breakdown: SectionAnalytics[];
  student_responses: StudentResponseRow[];
  non_responders: NonResponderRow[];
}

export interface CreatePollPayload {
  question: string;
  description?: string;
  poll_type: PollType;
  status: PollStatus;
  department: string;
  batch: string;
  sections: string[]; // ['ALL'] or ['AIML-A', 'AIML-B', ...]
  options: string[]; // minimum 2 option texts
  start_date?: string | null;
  end_date?: string | null;
  allow_response_change: boolean;
}

export interface UpdatePollPayload extends Partial<CreatePollPayload> {
  id: string;
}
