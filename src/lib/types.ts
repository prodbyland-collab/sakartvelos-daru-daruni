export type Profile = {
  id: string;
  full_name: string;
  birth_date: string | null;
  gender: string | null;
  seeking: string;
  city: string | null;
  bio: string;
  occupation: string | null;
  height_cm: number | null;
  interests: string[];
  photos: string[];
  avatar_url: string | null;
  is_verified: boolean;
  onboarded: boolean;
  last_seen: string;
};

export type MatchRow = {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
};

export type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};
