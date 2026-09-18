export type Period = 'antes' | 'depois';
export type Label = 'Favorável' | 'Contrário' | 'Neutro';

export interface User {
  id: number;
  name: string;
}

export interface Comment {
  id: number;
  annotation_id: number;
  period: Period;
  text: string;
  youtube_comment_id: string | null;
  youtube_video_id: string | null;
  created_at: string;
}

export interface Annotation {
  id: number;
  user_id: number;
  comment_id: number;
  label: Label;
  note: string | null;
  is_difficult: boolean | number;
  created_at: string;
  updated_at: string;
}

export interface Progress {
  completed_count: number;
  total_count: number;
  percentage: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
