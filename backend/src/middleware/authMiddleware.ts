import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

function getAccessSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não configurado');
  }
  return secret;
}

export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ success: false, error: 'Token de acesso ausente' });
    return;
  }

  try {
    const payload = jwt.verify(token, getAccessSecret());
    if (
      typeof payload !== 'object' ||
      typeof payload.id !== 'number' ||
      typeof payload.name !== 'string' ||
      payload.tokenType !== 'access'
    ) {
      res.status(401).json({ success: false, error: 'Token de acesso inválido' });
      return;
    }

    req.user = { id: payload.id, name: payload.name };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token de acesso expirado' });
      return;
    }
    res.status(401).json({ success: false, error: 'Token de acesso inválido' });
  }
}

export function getUserFromTokenPayload(payload: jwt.JwtPayload): UserPayload {
  if (
    typeof payload.id !== 'number' ||
    typeof payload.name !== 'string' ||
    payload.tokenType !== 'refresh'
  ) {
    throw new Error('Refresh token inválido');
  }
  return { id: payload.id, name: payload.name };
}
