import dotenv from 'dotenv';
import path from 'path';
import { database } from './config/database';
import { ExcelImporterService } from './services/excelImporter';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Script de seed para popular o banco com dados iniciais
 * Executa: npm run seed
 */
async function seed() {
  try {
    const configuredExcelPath = process.env.EXCEL_DATA_PATH;
    const excelPath = configuredExcelPath
      ? path.isAbsolute(configuredExcelPath)
        ? configuredExcelPath
        : path.resolve(__dirname, '../../', configuredExcelPath)
      : path.join(__dirname, '../../data/excel');
    const excelImporter = new ExcelImporterService(excelPath);
    console.log('\n' + '='.repeat(70));
    console.log('🌱 INICIANDO SEED - Importação de Dados');
    console.log('='.repeat(70) + '\n');

    // 1. Inicializar banco de dados
    console.log('📊 1. Inicializando banco de dados...');
    await database.initialize();
    console.log('   ✅ Banco de dados pronto\n');

    // 2. Verificar se já há dados
    console.log('🔍 2. Verificando dados existentes...');
    const existing = await database.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM comments'
    );
    const commentCount = existing?.count || 0;

    if (commentCount > 0) {
      console.log(
        `   ⚠️  Já existem ${commentCount} comentários no banco de dados`
      );
      console.log('   Deseja limpar e reimportar? (Isso apagará dados anteriores)\n');

      const confirmed = process.argv.includes('--confirm') || process.env.SEED_CONFIRM === 'YES';
      if (!confirmed) {
        throw new Error('Seed cancelado: para apagar dados existentes, execute com --confirm ou SEED_CONFIRM=YES');
      }

      console.log('   🗑️  Limpando dados antigos...');
      await database.run('DELETE FROM annotations');
      await database.run('DELETE FROM comments');
      await database.run('DELETE FROM audit_log');
      console.log('   ✅ Dados antigos removidos\n');
    }

    // 3. Importar comentários do Excel
    console.log('📥 3. Importando comentários do Excel...');
    const comments = await excelImporter.importAllComments();

    // 4. Validar dados importados
    console.log('\n✅ 4. Validando dados importados...');
    const validation = excelImporter.validateImportedData(comments);

    if (!validation.isValid) {
      console.log('\n❌ Validação falhou:');
      validation.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
      process.exit(1);
    }

    console.log(`   ✅ Validação passou!`);
    console.log(`   📊 Total: ${validation.totalComments} comentários`);
    console.log(`   📅 Período "antes": ${validation.beforePeriod}`);
    console.log(`   📅 Período "depois": ${validation.afterPeriod}\n`);

    // 5. Inserir comentários no banco
    console.log('💾 5. Inserindo comentários no banco de dados...');

    let inserted = 0;
    for (const comment of comments) {
      try {
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
        inserted++;

        // Mostrar progresso a cada 50 comentários
        if (inserted % 50 === 0) {
          console.log(`   📝 ${inserted}/${comments.length} comentários inseridos...`);
        }
      } catch (error) {
        console.error(
          `   ❌ Erro ao inserir comentário ${comment.annotation_id}:`,
          (error as Error).message
        );
      }
    }

    console.log(`   ✅ ${inserted} comentários inseridos com sucesso\n`);

    // 6. Verificar dados no banco
    console.log('🔍 6. Verificando dados no banco...');
    const totalResult = await database.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM comments'
    );
    const finalCount = totalResult?.count || 0;

    const beforeResult = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM comments WHERE period = 'antes'`
    );
    const beforeCount = beforeResult?.count || 0;

    const afterResult = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM comments WHERE period = 'depois'`
    );
    const afterCount = afterResult?.count || 0;

    console.log(`   ✅ Total no banco: ${finalCount} comentários`);
    console.log(
      `   📅 "antes": ${beforeCount} | "depois": ${afterCount}\n`
    );

    // 7. Resumo final
    console.log('='.repeat(70));
    console.log('✅ SEED CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(70));
    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ ${finalCount} comentários importados`);
    console.log(`   📅 ${beforeCount} comentários "antes de 01/01/2025"`);
    console.log(`   📅 ${afterCount} comentários "depois de 01/01/2025"`);
    console.log(`    Banco: ${process.env.DATABASE_PATH || './db/kappa.sqlite'}`);
    console.log('\n✅ Comentários prontos para anotação.\n');

    // 8. Registrar no audit log
    await database.run(
      `INSERT INTO audit_log (user_id, action, details) 
       VALUES (NULL, 'seed', ?)`,
      [JSON.stringify({ imported: finalCount, timestamp: new Date().toISOString() })]
    );

    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO NO SEED:', error);
    process.exit(1);
  }
}

// Executar seed
seed();
