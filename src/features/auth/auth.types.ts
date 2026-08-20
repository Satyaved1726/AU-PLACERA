import type { UserProfile } from '../../types';

export interface AuthSession {
  access_token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface AuthContextType {
  user: any | null; // Supabase user payload
  profile: UserProfile | null; // Decoded profiles table row
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; user?: any; profile?: UserProfile }>;
  signOut: () => Promise<void>;
  supabaseEnabled: boolean;
}
