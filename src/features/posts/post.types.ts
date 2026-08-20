import type { PostType } from '../../types';

export interface Post {
  id: string;
  original_content: string;
  post_type: PostType;
  company_name: string | null;
  opportunity_title: string | null;
  is_top_priority: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  audience?: 'general' | 'oia';
}

export interface ParsedPost {
  originalContent: string;
  postType: 'opportunity' | 'announcement';
  companyName?: string;
  opportunityTitle?: string;
  isTopPriority?: boolean;
  audience?: 'general' | 'oia';
}
