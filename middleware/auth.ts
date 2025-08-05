import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: DecodedToken;
}

interface DecodedToken {
  id: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Simple in-memory rate limiting for auth attempts
const authAttempts = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_ATTEMPTS = 5;

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Rate limiting for auth attempts
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const clientAttempts = authAttempts.get(clientIp);
    
    if (clientAttempts && now < clientAttempts.resetTime) {
      if (clientAttempts.count >= MAX_AUTH_ATTEMPTS) {
        res.status(429).json({ 
          message: 'Too many authentication attempts. Please try again later.',
          retryAfter: Math.ceil((clientAttempts.resetTime - now) / 1000)
        });
        return;
      }
    } else {
      // Reset rate limit
      authAttempts.set(clientIp, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
    }

    // Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set!');
      res.status(500).json({ message: 'Server configuration error' });
      return;
    }

    let token: string | undefined = req.cookies?.token;

    // Fallback to Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // Increment failed attempt
      const attempts = authAttempts.get(clientIp);
      if (attempts) {
        attempts.count++;
      }
      
      res.status(401).json({ message: 'Unauthorized: No token provided' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    
    // Validate decoded token structure
    if (!decoded || !decoded.id) {
      // Increment failed attempt
      const attempts = authAttempts.get(clientIp);
      if (attempts) {
        attempts.count++;
      }
      
      res.status(401).json({ message: 'Unauthorized: Invalid token structure' });
      return;
    }

    // Reset rate limit on successful auth
    authAttempts.delete(clientIp);
    
    req.user = decoded;
    next();
  } catch (err) {
    // Increment failed attempt
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const attempts = authAttempts.get(clientIp);
    if (attempts) {
      attempts.count++;
    }
    
    console.error('JWT verification error:', err);
    
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Unauthorized: Invalid token' });
      return;
    }
    
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Unauthorized: Token expired' });
      return;
    }
    
    res.status(401).json({ message: 'Unauthorized: Token verification failed' });
  }
};
