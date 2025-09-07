"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Simple in-memory rate limiting for auth attempts
const authAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_ATTEMPTS = 5;
const authenticate = (req, res, next) => {
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
        }
        else {
            // Reset rate limit
            authAttempts.set(clientIp, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
        }
        // Check if JWT_SECRET is available
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET environment variable is not set!');
            res.status(500).json({ message: 'Server configuration error' });
            return;
        }
        let token = req.cookies?.token;
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
    }
    catch (err) {
        // Increment failed attempt
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const attempts = authAttempts.get(clientIp);
        if (attempts) {
            attempts.count++;
        }
        console.error('JWT verification error:', err);
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ message: 'Unauthorized: Invalid token' });
            return;
        }
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ message: 'Unauthorized: Token expired' });
            return;
        }
        res.status(401).json({ message: 'Unauthorized: Token verification failed' });
    }
};
exports.authenticate = authenticate;
