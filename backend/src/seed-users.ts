import dotenv from 'dotenv';
import { database } from './config/database';
import { createUser } from './services/user';

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

const users = [
  { name: 'Avaliador 1', password: process.env.EVALUATOR_1_PASSWORD || 'Avaliador1@TCC' },
  { name: 'Avaliador 2', password: process.env.EVALUATOR_2_PASSWORD || 'Avaliador2@TCC' },
  { name: 'Avaliador 3', password: process.env.EVALUATOR_3_PASSWORD || 'Avaliador3@TCC' },
  { name: 'Avaliador 4', password: process.env.EVALUATOR_4_PASSWORD || 'Avaliador4@TCC' },
];

async function seedUsers(): Promise<void> {
  try {
    await database.initialize();
    for (const user of users) {
      try {
        await createUser(user.name, user.password);
        console.log(`✅ ${user.name} criado`);
      } catch (error) {
        if ((error as Error).message === 'Usuário já existe') {
          console.log(`ℹ️  ${user.name} já existe`);
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    process.exitCode = 1;
  } finally {
    await database.close();
  }
}

seedUsers();
