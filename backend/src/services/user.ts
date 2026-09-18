import bcrypt from 'bcryptjs';
import { database } from '../config/database';
import { User, UserPayload } from '../types';

const PASSWORD_SALT_ROUNDS = 12;

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
