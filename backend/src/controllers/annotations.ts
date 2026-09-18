import { Request, Response } from 'express';
import { database } from '../config/database';
import { Annotation, AnnotationPayload, ApiResponse } from '../types';

const VALID_LABELS = ['Favorável', 'Contrário', 'Neutro'] as const;

function getAuthenticatedUserId(req: Request): number {
  if (!req.user) {
    throw new Error('Usuário não autenticado');
  }
  return req.user.id;
}

export class AnnotationController {
  async getMine(req: Request, res: Response): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      const commentId = req.query.comment_id
        ? Number(req.query.comment_id)
        : undefined;

      if (commentId !== undefined && (!Number.isInteger(commentId) || commentId <= 0)) {
        res.status(400).json({ success: false, error: 'comment_id inválido' });
        return;
      }

      const annotations = await database.all<Annotation>(
        `SELECT a.*
         FROM annotations a
         WHERE a.user_id = ? ${commentId !== undefined ? 'AND a.comment_id = ?' : ''}
         ORDER BY a.comment_id`,
        commentId !== undefined ? [userId, commentId] : [userId]
      );

      res.json({ success: true, data: annotations } as ApiResponse<Annotation[]>);
    } catch (error) {
      console.error('Erro ao buscar anotações:', error);
      res.status(500).json({ success: false, error: 'Erro ao buscar anotações' });
    }
  }

  async save(req: Request, res: Response): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      const commentId = Number(req.params.commentId);
      const { label, note, is_difficult: isDifficult } = req.body as AnnotationPayload;

      if (!Number.isInteger(commentId) || commentId <= 0) {
        res.status(400).json({ success: false, error: 'commentId inválido' });
        return;
      }
      if (!VALID_LABELS.includes(label)) {
        res.status(400).json({
          success: false,
          error: 'label deve ser Favorável, Contrário ou Neutro',
        });
        return;
      }
      if (note !== undefined && note !== null && typeof note !== 'string') {
        res.status(400).json({ success: false, error: 'note deve ser texto' });
        return;
      }
      if (isDifficult !== undefined && typeof isDifficult !== 'boolean') {
        res.status(400).json({ success: false, error: 'is_difficult deve ser booleano' });
        return;
      }

      const comment = await database.get<{ id: number }>(
        'SELECT id FROM comments WHERE id = ?',
        [commentId]
      );
      if (!comment) {
        res.status(404).json({ success: false, error: 'Comentário não encontrado' });
        return;
      }

      await database.run(
        `INSERT INTO annotations (user_id, comment_id, label, note, is_difficult)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, comment_id) DO UPDATE SET
           label = excluded.label,
           note = excluded.note,
           is_difficult = excluded.is_difficult,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, commentId, label, note || null, Boolean(isDifficult)]
      );

      const annotation = await database.get<Annotation>(
        'SELECT * FROM annotations WHERE user_id = ? AND comment_id = ?',
        [userId, commentId]
      );

      await database.run(
        'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
        [userId, 'annotation_saved', JSON.stringify({ commentId, label })]
      );

      res.json({ success: true, data: annotation } as ApiResponse<Annotation | undefined>);
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      res.status(500).json({ success: false, error: 'Erro ao salvar anotação' });
    }
  }

  async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      const progress = await database.get<{
        completed_count: number;
        total_count: number;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM annotations WHERE user_id = ?) AS completed_count,
           (SELECT COUNT(*) FROM comments) AS total_count`,
        [userId]
      );
      const completed = progress?.completed_count || 0;
      const total = progress?.total_count || 0;

      res.json({
        success: true,
        data: {
          completed_count: completed,
          total_count: total,
          percentage: total ? Math.round((completed / total) * 10000) / 100 : 0,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar progresso:', error);
      res.status(500).json({ success: false, error: 'Erro ao buscar progresso' });
    }
  }
}

export default new AnnotationController();
