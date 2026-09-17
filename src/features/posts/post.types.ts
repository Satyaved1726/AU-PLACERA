import type { PostType } from '../../types';

export type PriorityDuration = '24_hours' | '3_days' | '7_days' | 'custom' | 'manual';

export interface Post {
  id: string;
  original_content: string;
  post_type: PostType;
  company_name: string | null;
  opportunity_title: string | null;
  is_top_priority: boolean;
  is_priority?: boolean;
  priority_started_at?: string | null;
  priority_expires_at?: string | null;
  priority_duration?: PriorityDuration | string | null;
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
  priorityDuration?: PriorityDuration;
  priorityExpiresAt?: string | null;
  audience?: 'general' | 'oia';
  attachments?: File[];
}

/**
 * Determines whether a Post or Poll currently has active priority status.
 * Returns true if is_priority is true and either priority_expires_at is null (manual) or in the future.
 */
export function isPriorityActive(item?: {
  is_priority?: boolean;
  is_top_priority?: boolean;
  priority_expires_at?: string | null;
} | null): boolean {
  if (!item) return false;
  const isPri = Boolean(item.is_priority ?? item.is_top_priority);
  if (!isPri) return false;
  if (!item.priority_expires_at) return true; // manual or until turned off
  return new Date(item.priority_expires_at).getTime() > Date.now();
}

/**
 * Calculates the ISO expiration date string given a selected PriorityDuration.
 */
export function calculatePriorityExpiresAt(
  duration: PriorityDuration,
  customDate?: string | null
): string | null {
  const now = new Date();
  if (duration === '24_hours') {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
  if (duration === '3_days') {
    return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (duration === '7_days') {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (duration === 'custom') {
    return customDate ? new Date(customDate).toISOString() : null;
  }
  if (duration === 'manual') {
    return null;
  }
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}
