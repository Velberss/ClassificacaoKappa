import bcrypt from 'bcryptjs';
import { database } from '../config/database';
import { User, UserPayload } from '../types';

const PASSWORD_SALT_ROUNDS = 12;

const evaluatorPasswordVariables = [
  'EVALUATOR_1_PASSWORD',
  'EVALUATOR_2_PASSWORD',
  'EVALUATOR_3_PASSWORD',
  'EVALUATOR_4_PASSWORD',
] as const;

const defaultEvaluatorPasswords = [
  'Avaliador1@TCC',
  'Avaliador2@TCC',
  'Avaliador3@TCC',
  'Avaliador4@TCC',
] as const;

export const evaluatorUsers = evaluatorPasswordVariables.map((passwordVariable, index) => ({
  name: `Avaliador ${index + 1}`,
  passwordVariable,
  defaultPassword: defaultEvaluatorPasswords[index],
}));

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function createUser(
  name: string,
  password: string
): Promise<UserPayload> {
  const normalizedName = name.trim();
  if (!normalizedName || !password) {
    throw new Error('Nome e senha são obrigatórios');
  }

  const existingUser = await database.get<User>(
    'SELECT id FROM users WHERE name = ?',
    [normalizedName]
  );
  if (existingUser) {
    throw new Error('Usuário já existe');
  }

  const passwordHash = await hashPassword(password);
  const result = await database.run(
    'INSERT INTO users (name, password_hash) VALUES (?, ?)',
    [normalizedName, passwordHash]
  );

  return { id: result.lastID, name: normalizedName };
}

export async function ensureEvaluatorUsers(): Promise<void> {
  for (const evaluator of evaluatorUsers) {
    const existingUser = await database.get<Pick<User, 'id'>>(
      'SELECT id FROM users WHERE name = ?',
      [evaluator.name]
    );

    if (existingUser) {
      console.log(`ℹ️  ${evaluator.name} já existe`);
      continue;
    }

    const configuredPassword = process.env[evaluator.passwordVariable];
    if (process.env.NODE_ENV === 'production' && !configuredPassword) {
      throw new Error(`Variável obrigatória ausente: ${evaluator.passwordVariable}`);
    }

    const password = configuredPassword || evaluator.defaultPassword;
    await createUser(evaluator.name, password);
    console.log(`✅ ${evaluator.name} criado`);
  }
}

export async function authenticateUser(
  identifier: string,
  password: string
): Promise<UserPayload | null> {
  const user = await database.get<User>(
    'SELECT id, name, password_hash, created_at FROM users WHERE name = ?',
    [identifier.trim()]
  );

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }

  return { id: user.id, name: user.name };
}
