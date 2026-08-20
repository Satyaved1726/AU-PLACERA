// TypeScript definitions for AU Placera

export type UserRole = 'admin' | 'student' | 'super_admin';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  roll_number?: string;
  branch: 'AIML';
  section?: 'AIML-A' | 'AIML-B' | 'AIML-C' | 'AIML-D' | 'AIML-E';
  year?: 1 | 2 | 3 | 4;
  batch?: string; // e.g. "2023-2027"
  role: UserRole;
  status?: 'active' | 'inactive' | 'suspended';
  oia_eligible: boolean;
  created_at?: string;
  updated_at?: string;
}

export type PostType = 'opportunity' | 'announcement' | 'oia';

export interface Post {
  id: string;
  original_content: string;
  post_type: PostType;
  company_name: string | null;
  opportunity_title: string | null;
  is_top_priority: boolean;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
  audience: 'general' | 'oia';
  profiles?: {
    full_name: string;
    role: string;
    email?: string;
  } | null;
}

export interface Registration {
  id: string;
  student_id: string;
  post_id: string;
  registered_at: string;
  // Joined fields for admin convenience
  student_name?: string;
  roll_number?: string;
  section?: string;
  year?: number;
  company_name?: string;
  opportunity_title?: string;
  email?: string;
  phone?: string;
  department?: string;
  branch?: string;
  batch?: string;
  post?: Post;
}

export interface SavedPost {
  id: string;
  student_id: string;
  post_id: string;
  saved_at: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  category: string; // e.g. Aptitude, Coding, Company Prep
  file_url: string | null;
  external_url: string | null;
  is_oia: boolean;
  created_by: string;
  created_at: string;
}

export interface DigitalAnnouncement {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  external_url: string | null;
  is_oia: boolean;
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  } | null;
}

export interface MaterialsConfig {
  id: string;
  title: string;
  description?: string;
  drive_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
