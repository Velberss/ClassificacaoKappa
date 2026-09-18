import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  AuthResponse,
  ApiResponse,
  LoginRequest,
  UserPayload,
} from '../types';
import {
  authenticateUser,
} from '../services/user';
import { getUserFromTokenPayload } from '../middleware/authMiddleware';

function getSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} não configurado`);
  }
  return secret;
}

function getExpiration(name: 'JWT_EXPIRATION' | 'JWT_REFRESH_EXPIRATION') {
  return (process.env[name] || (name === 'JWT_EXPIRATION' ? '24h' : '7d')) as jwt.SignOptions['expiresIn'];
}

function createTokens(user: UserPayload): Pick<AuthResponse, 'accessToken' | 'refreshToken'> {
  const accessToken = jwt.sign(
    { id: user.id, name: user.name, tokenType: 'access' },
    getSecret('JWT_SECRET'),
    { expiresIn: getExpiration('JWT_EXPIRATION') }
  );
  const refreshToken = jwt.sign(
    { id: user.id, name: user.name, tokenType: 'refresh' },
    getSecret('JWT_REFRESH_SECRET'),
    { expiresIn: getExpiration('JWT_REFRESH_EXPIRATION') }
  );
  return { accessToken, refreshToken };
}

export async function login(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body as LoginRequest;
  const identifier = name || email;

  if (!identifier || !password) {
    res.status(400).json({
      success: false,
      error: 'Informe name (ou email) e password',
    } as ApiResponse<never>);
    return;
  }

  const user = await authenticateUser(identifier, password);
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Credenciais inválidas',
    } as ApiResponse<never>);
    return;
  }

  res.json({
    success: true,
    data: (() => {
      const tokens = createTokens(user);
      return {
        user,
        ...tokens,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      };
    })(),
  } as ApiResponse<AuthResponse>);
}

export function refresh(req: Request, res: Response): void {
  const { refresh_token: refreshToken, refreshToken: camelCaseToken } = req.body as {
    refresh_token?: string;
    refreshToken?: string;
  };
  const token = refreshToken || camelCaseToken;

  if (!token) {
    res.status(400).json({ success: false, error: 'Refresh token é obrigatório' });
    return;
  }

  try {
    const payload = jwt.verify(token, getSecret('JWT_REFRESH_SECRET'));
    if (typeof payload !== 'object') {
      throw new Error('Refresh token inválido');
    }
    const user = getUserFromTokenPayload(payload);
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, tokenType: 'access' },
      getSecret('JWT_SECRET'),
      { expiresIn: getExpiration('JWT_EXPIRATION') }
    );
    res.json({ success: true, data: { accessToken, access_token: accessToken } });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Refresh token inválido ou expirado' });
  }
}

export function logout(req: Request, res: Response): void {
  res.json({ success: true, message: 'Logout realizado' });
}
