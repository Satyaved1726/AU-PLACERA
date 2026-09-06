// TypeScript definitions for WhatsApp-Style AU Placera Polls System

export interface Poll {
  id: string;
  question: string;
  allow_multiple_answers: boolean;
  is_priority?: boolean;
  created_by: string | null;
  created_at: string;
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
  vote_count?: number;
  percentage?: number;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  student_id: string;
  voted_at: string;
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
  voted_at: string;
}

export interface PollWithDetails extends Poll {
  options: PollOption[];
  user_vote?: StudentPollVote | null;
  total_voted?: number;
}

export interface OptionVoteCount {
  option_id: string;
  option_text: string;
  votes: number;
  percentage: number; // percentage of students who selected this option
}

export interface SectionAnalytics {
  section: string; // 'AIML-A'
  display_section: string; // 'Section A'
  option_counts: Record<string, number>; // option_id -> count of votes in this section
  students_voted: number;
  eligible_students: number;
  response_rate: number; // percentage
}

export interface StudentResponseRow {
  student_id: string;
  roll_number: string;
  student_name: string;
  section: string;
  selected_options: string[]; // option texts
  voted_at: string;
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
  total_students: number;
  students_voted: number;
  not_responded: number;
  response_rate: number;
  option_breakdown: OptionVoteCount[];
  section_breakdown: SectionAnalytics[];
  student_responses: StudentResponseRow[];
  non_responders: NonResponderRow[];
}

export interface CreatePollPayload {
  question: string;
  options: string[]; // Minimum 2 options, user-provided
  allow_multiple_answers: boolean;
  is_priority?: boolean;
  notify_students?: boolean;
}
