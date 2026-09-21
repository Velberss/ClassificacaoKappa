import path from 'path';
import { database } from '../config/database';
import { ExcelImporterService } from './excelImporter';

function getExcelPath(): string {
  const configuredPath = process.env.EXCEL_DATA_PATH;
  if (!configuredPath) {
    return path.join(__dirname, '../../../data/excel');
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, '../../../', configuredPath);
}

export async function ensureComments(): Promise<void> {
  const existing = await database.get<{ count: number | string }>(
    'SELECT COUNT(*) as count FROM comments'
  );
  const commentCount = Number(existing?.count || 0);

  if (commentCount > 0) {
    console.log(`ℹ️  ${commentCount} comentários já existem`);
    return;
  }

  console.log('📥 Nenhum comentário encontrado. Iniciando importação inicial...');

  const excelImporter = new ExcelImporterService(getExcelPath());
  const comments = await excelImporter.importAllComments();
  const validation = excelImporter.validateImportedData(comments);

  if (!validation.isValid) {
    throw new Error(`Validação dos comentários falhou: ${validation.errors.join('; ')}`);
  }

  for (const comment of comments) {
    await database.run(
      `INSERT INTO comments (
        annotation_id,
        youtube_comment_id,
        youtube_video_id,
        period,
        text
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        comment.annotation_id,
        comment.youtube_comment_id,
        comment.youtube_video_id,
        comment.period,
        comment.text,
      ]
    );
  }

  const imported = await database.get<{ count: number | string }>(
    'SELECT COUNT(*) as count FROM comments'
  );
  const finalCount = Number(imported?.count || 0);

  if (finalCount !== validation.totalComments) {
    throw new Error(
      `Importação incompleta: ${finalCount} de ${validation.totalComments} comentários`
    );
  }

  console.log(`✅ ${finalCount} comentários importados com sucesso.`);
}
