import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { database } from './config/database';
import { ensureEvaluatorUsers } from './services/user';
import { ensureComments } from './services/commentInitializer';
import commentsRouter from './routes/comments';
import authRouter from './routes/auth';
import annotationsRouter from './routes/annotations';

// Carregar variáveis de ambiente
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const requiredSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const insecureValues = ['development', 'change-me', 'sua_chave', 'replace-with'];
  for (const name of requiredSecrets) {
    const value = process.env[name];
    if (!value || value.length < 32 || insecureValues.some((part) => value.toLowerCase().includes(part))) {
      throw new Error(`${name} deve ser uma chave de produção longa e segura`);
    }
  }
}

// ============================================
// MIDDLEWARE
// ============================================

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROTAS DE SAÚDE
// ============================================

/**
 * GET /health
 * Verificar se o servidor está rodando
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '✅ Servidor TCC Aviator Annotation rodando',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/status
 * Status detalhado do servidor e banco de dados
 */
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    // Testar conexão com banco de dados
    const result = process.env.DATABASE_URL
      ? await database.get<{ count: number }>(
          "SELECT COUNT(*)::integer as count FROM information_schema.tables WHERE table_schema = 'public'"
        )
      : await database.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"'
        );

    res.json({
      success: true,
      status: 'online',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        tables: result?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      error: (error as Error).message,
    });
  }
});

// ============================================
// ROTAS DA API
// ============================================

// Rotas de comentários (Fase 2 - ATIVA)
app.use('/api/comments', commentsRouter);

// Rotas de autenticação (Fase 3)
app.use('/api/auth', authRouter);
app.use('/api/annotations', annotationsRouter);

// Em produção, o Express entrega o build do React no mesmo domínio da API.
app.use(express.static(frontendDistPath));
app.get(/^(?!\/api(?:\/|$)|\/health$).*/, (req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// 404 Not Found
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.path}`,
  });
});

// Error handler global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Erro não capturado:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

async function startServer() {
  try {
    validateProductionConfig();
    // Inicializar banco de dados
    console.log('\n🗄️  Inicializando banco de dados...');
    await database.initialize();
    await ensureComments();
    console.log('👥 Verificando usuários avaliadores...');
    await ensureEvaluatorUsers();

    // Iniciar servidor HTTP
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 TCC AVIATOR ANNOTATION - BACKEND');
      console.log('='.repeat(60));
      console.log(`\n✅ Servidor rodando em: http://localhost:${PORT}`);
      console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Banco de dados: ${process.env.DATABASE_URL ? 'PostgreSQL' : process.env.DATABASE_PATH || './db/kappa.sqlite'}`);
      console.log('\n📍 Rotas disponíveis:');
      console.log(`   GET  /health                    - Verificar saúde do servidor`);
      console.log(`   GET  /api/status                - Status detalhado`);
      console.log(`   GET  /api/comments              - Listar comentários [FASE 2]`);
      console.log(`   GET  /api/comments/:id          - Buscar comentário específico`);
      console.log(`   GET  /api/comments/period/:period - Filtrar por período`);
      console.log(`   GET  /api/comments/stats        - Estatísticas`);
      console.log('\n⏭️  Status das fases:');
      console.log(`   ✅ Fase 1: Estrutura base (COMPLETA)`);
      console.log(`   ⏳ Fase 2: Comentários (ATIVA - execute: npm run seed)`);
      console.log(`   ⏳ Fase 3: Autenticação`);
      console.log(`   ⏳ Fase 4: Interface de anotação`);
      console.log('\n' + '='.repeat(60) + '\n');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor se este arquivo for executado diretamente
if (require.main === module) {
  startServer();
}

export default app;
