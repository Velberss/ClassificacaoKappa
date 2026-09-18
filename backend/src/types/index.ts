import { Request } from 'express';

// Tipos para usuários/avaliadores
export interface User {
  id: number;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface UserPayload {
  id: number;
  name: string;
}

// Tipos para comentários
export interface Comment {
  id: number;
  annotation_id: number;
  youtube_comment_id: string;
  youtube_video_id: string;
  period: 'antes' | 'depois';
  text: string;
  created_at: string;
}

// Tipos para anotações
export interface Annotation {
  id: number;
  user_id: number;
  comment_id: number;
  label: 'Favorável' | 'Contrário' | 'Neutro' | null;
  note: string | null;
  is_difficult: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnotationPayload {
  label: 'Favorável' | 'Contrário' | 'Neutro';
  note?: string;
  is_difficult?: boolean;
}

// Tipos para autenticação
export interface LoginRequest {
  name?: string;
  email?: string;
  password: string;
}

export interface AuthResponse {
  user: UserPayload;
  accessToken: string;
  refreshToken: string;
  access_token: string;
  refresh_token: string;
}

// Tipos para respostas de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

// Tipos para progresso
export interface AnnotatorProgress {
  user_id: number;
  user_name: string;
  completed_count: number;
  total_count: number;
  percentage: number;
}
