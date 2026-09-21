import dotenv from 'dotenv';
import { database } from './config/database';
import { ensureEvaluatorUsers } from './services/user';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const passwordVariables = [
  'EVALUATOR_1_PASSWORD',
  'EVALUATOR_2_PASSWORD',
  'EVALUATOR_3_PASSWORD',
  'EVALUATOR_4_PASSWORD',
] as const;

if (isProduction) {
  const missing = passwordVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`❌ Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function seedUsers(): Promise<void> {
  try {
    await database.initialize();
    await ensureEvaluatorUsers();
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    process.exitCode = 1;
  } finally {
    await database.close();
  }
}

seedUsers();
