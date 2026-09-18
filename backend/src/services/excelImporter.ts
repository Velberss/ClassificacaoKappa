import XLSX, { WorkSheet } from 'xlsx';
import path from 'path';
import fs from 'fs';
import { Comment } from '../types/index';

/**
 * Serviço para importar dados de comentários das planilhas Excel
 * Lê os arquivos .xlsx da pasta data/excel e valida os dados
 */
export class ExcelImporterService {
  private excelPath: string;

  constructor(excelPath?: string) {
    this.excelPath =
      excelPath ||
      process.env.EXCEL_DATA_PATH ||
      path.join(__dirname, '../../data/excel');
  }

  /**
   * Lê um arquivo Excel e extrai os dados de comentários
   * @param filePath - Caminho do arquivo Excel
   * @returns Array de comentários
   */
  private readExcelFile(filePath: string): any[] {
    console.log(`📖 Lendo arquivo: ${path.basename(filePath)}`);

    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    // Ler arquivo Excel
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      throw new Error(`Nenhuma planilha encontrada em ${filePath}`);
    }

    // Converter para JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`   ✅ ${data.length} linhas lidas`);
    return data;
  }

  /**
   * Valida um comentário extraído do Excel
   * @param row - Linha do Excel
   * @param rowIndex - Índice da linha
   * @returns Comentário validado ou null se inválido
   */
  private validateComment(row: any, rowIndex: number): any | null {
    // Campos obrigatórios
    const required = [
      'id_anotacao',
      'comentario_id',
      'video_id',
      'periodo',
      'texto',
    ];

    // Verificar campos obrigatórios
    for (const field of required) {
      if (!row[field]) {
        console.warn(
          `   ⚠️  Linha ${rowIndex}: Campo "${field}" vazio ou ausente`
        );
        return null;
      }
    }

    // Validar período
    if (!['antes', 'depois'].includes(String(row.periodo).toLowerCase())) {
      console.warn(
        `   ⚠️  Linha ${rowIndex}: Período inválido: ${row.periodo}`
      );
      return null;
    }

    // Validar texto (mínimo de caracteres)
    const texto = String(row.texto).trim();
    if (texto.length < 4) {
      console.warn(
        `   ⚠️  Linha ${rowIndex}: Texto muito curto (${texto.length} caracteres)`
      );
      return null;
    }

    // Retornar comentário processado
    return {
      annotation_id: Number(row.id_anotacao),
      youtube_comment_id: String(row.comentario_id).trim() || null,
      youtube_video_id: String(row.video_id).trim() || null,
      period: String(row.periodo).toLowerCase(),
      text: texto,
    };
  }

  /**
   * Importa comentários de um arquivo Excel
   * @param filePath - Caminho do arquivo Excel
   * @returns Array de comentários validados
   */
  async importCommentsFromFile(filePath: string): Promise<any[]> {
    try {
      const rawData = this.readExcelFile(filePath);
      const validatedComments: any[] = [];
      let invalidCount = 0;

      for (let i = 0; i < rawData.length; i++) {
        const validated = this.validateComment(rawData[i], i + 2); // +2 porque começa em linha 2 (header é linha 1)
        if (validated) {
          validatedComments.push(validated);
        } else {
          invalidCount++;
        }
      }

      console.log(
        `   ✅ ${validatedComments.length} comentários validados${invalidCount > 0 ? ` (${invalidCount} inválidos)` : ''}`
      );

      return validatedComments;
    } catch (error) {
      console.error(
        `❌ Erro ao importar ${path.basename(filePath)}:`,
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  /**
   * Importa comentários de todos os arquivos de avaliadores
   * Retorna apenas os comentários únicos (mesmo set de 300 para todos)
   * @returns Array de comentários únicos
   */
  async importAllComments(): Promise<any[]> {
    console.log('\n📊 Importando comentários de todos os avaliadores...\n');

    const allComments: any[] = [];
    const evaluatorFiles = [
      'avaliador_1_kappa300.xlsx',
      'avaliador_2_kappa300.xlsx',
      'avaliador_3_kappa300.xlsx',
      'avaliador_4_kappa300.xlsx',
    ];

    for (const filename of evaluatorFiles) {
      const filePath = path.join(this.excelPath, filename);
      try {
        const comments = await this.importCommentsFromFile(filePath);
        allComments.push(...comments);
      } catch (error) {
        console.error(`❌ Falha ao importar ${filename}`);
        throw error;
      }
    }

    // Remover duplicatas (mesmo set de 300 comentários)
    console.log(
      `\n🔍 Removendo duplicatas (esperado: mesmos 300 para todos)...`
    );
    const uniqueComments = this.removeDuplicates(allComments);

    console.log(`   ✅ Total único: ${uniqueComments.length} comentários`);

    return uniqueComments;
  }

  /**
   * Remove comentários duplicados baseado em annotation_id
   * @param comments - Array de comentários
   * @returns Array de comentários únicos
   */
  private removeDuplicates(comments: any[]): any[] {
    const seen = new Set<number>();
    const unique: any[] = [];

    for (const comment of comments) {
      if (!seen.has(comment.annotation_id)) {
        seen.add(comment.annotation_id);
        unique.push(comment);
      }
    }

    return unique.sort((a, b) => a.annotation_id - b.annotation_id);
  }

  /**
   * Valida se os dados importados estão corretos
   * @param comments - Array de comentários
   * @returns Objeto com estatísticas de validação
   */
  validateImportedData(comments: any[]): {
    totalComments: number;
    beforePeriod: number;
    afterPeriod: number;
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Verificar total
    if (comments.length !== 300) {
      errors.push(
        `Total de comentários inválido: ${comments.length} (esperado: 300)`
      );
    }

    // Verificar período
    const beforeCount = comments.filter((c) => c.period === 'antes').length;
    const afterCount = comments.filter((c) => c.period === 'depois').length;

    if (beforeCount !== 150) {
      errors.push(`Comentários "antes": ${beforeCount} (esperado: 150)`);
    }

    if (afterCount !== 150) {
      errors.push(`Comentários "depois": ${afterCount} (esperado: 150)`);
    }

    // Verificar annotation_id
    const ids = comments.map((c) => c.annotation_id).sort((a, b) => a - b);
    if (ids[0] !== 1 || ids[ids.length - 1] !== 300) {
      errors.push(
        `IDs de anotação fora do intervalo: ${ids[0]} a ${ids[ids.length - 1]}`
      );
    }

    // Verificar duplicatas
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== 300) {
      errors.push(
        `IDs duplicados detectados: ${300 - uniqueIds.size} duplicatas`
      );
    }

    return {
      totalComments: comments.length,
      beforePeriod: beforeCount,
      afterPeriod: afterCount,
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default new ExcelImporterService();
