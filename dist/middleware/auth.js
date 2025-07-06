"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const authenticate = (req, res, next) => {
    let token = req.cookies?.token;
    // Optional logging for debugging (disable in production)
    if (process.env.NODE_ENV !== 'production') {
        console.log('--- AUTH MIDDLEWARE ---');
        console.log('Incoming request:', {
            path: req.path,
            method: req.method,
            cookies: req.cookies,
            authHeader: req.headers.authorization || 'No Authorization header',
        });
    }
    // Fallback to Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    }
};
exports.authenticate = authenticate;
