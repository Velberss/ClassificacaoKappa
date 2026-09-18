import { Request, Response } from 'express';
import { database } from '../config/database';
import { Comment, ApiResponse } from '../types/index';

/**
 * Controlador para gerenciar comentários
 * Responsável por operações CRUD e consultas
 */
export class CommentController {
  /**
   * GET /api/comments
   * Retorna todos os comentários (ou uma página específica)
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
      const offset = (page - 1) * limit;

      // Buscar comentários com paginação
      const comments = await database.all<Comment>(
        `SELECT * FROM comments ORDER BY annotation_id LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      // Contar total
      const result = await database.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM comments'
      );
      const total = result?.count || 0;

      res.json({
        success: true,
        data: {
          comments,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar comentários',
      } as ApiResponse<any>);
    }
  }

  /**
   * GET /api/comments/:id
   * Retorna um comentário específico
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const comment = await database.get<Comment>(
        'SELECT * FROM comments WHERE id = ? OR annotation_id = ?',
        [id, id]
      );

      if (!comment) {
        res.status(404).json({
          success: false,
          error: 'Comentário não encontrado',
        } as ApiResponse<any>);
        return;
      }

      res.json({
        success: true,
        data: comment,
      } as ApiResponse<Comment>);
    } catch (error) {
      console.error('Erro ao buscar comentário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar comentário',
      } as ApiResponse<any>);
    }
  }

  /**
   * GET /api/comments/period/:period
   * Retorna comentários de um período específico
   */
  async getByPeriod(req: Request, res: Response): Promise<void> {
    try {
      const { period } = req.params as { period: string };

      if (!['antes', 'depois'].includes(period)) {
        res.status(400).json({
          success: false,
          error: 'Período inválido. Use "antes" ou "depois"',
        } as ApiResponse<any>);
        return;
      }

      const comments = await database.all<Comment>(
        'SELECT * FROM comments WHERE period = ? ORDER BY annotation_id',
        [period]
      );

      res.json({
        success: true,
        data: {
          period,
          count: comments.length,
          comments,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao buscar comentários por período:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar comentários',
      } as ApiResponse<any>);
    }
  }

  /**
   * POST /api/comments
   * Cria um novo comentário (raramente usado - geralmente via importação)
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { annotation_id, youtube_comment_id, youtube_video_id, period, text } =
        req.body;

      if (!annotation_id || !period || !text) {
        res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: annotation_id, period, text',
        } as ApiResponse<any>);
        return;
      }

      const result = await database.run(
        `INSERT INTO comments (annotation_id, youtube_comment_id, youtube_video_id, period, text)
         VALUES (?, ?, ?, ?, ?)`,
        [annotation_id, youtube_comment_id, youtube_video_id, period, text]
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.lastID,
          annotation_id,
          youtube_comment_id,
          youtube_video_id,
          period,
          text,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Erro ao criar comentário',
      } as ApiResponse<any>);
    }
  }

  /**
   * GET /api/comments/stats
   * Retorna estatísticas dos comentários
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await database.get<{
        total: number;
        before: number;
        after: number;
      }>(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN period = 'antes' THEN 1 ELSE 0 END) as before,
          SUM(CASE WHEN period = 'depois' THEN 1 ELSE 0 END) as after
         FROM comments`
      );

      res.json({
        success: true,
        data: {
          total: stats?.total || 0,
          beforeRegulation: stats?.before || 0,
          afterRegulation: stats?.after || 0,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas',
      } as ApiResponse<any>);
    }
  }
}

export default new CommentController();
