export const SECURITY_CONFIG = {
  // JWT Configuration
  JWT: {
    EXPIRES_IN: '7d',
    REFRESH_EXPIRES_IN: '30d',
    ALGORITHM: 'HS256' as const,
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // requests per window
    AUTH_ATTEMPTS: 5, // max auth attempts per window
    AUTH_WINDOW: 15 * 60 * 1000, // 15 minutes
  },
  
  // Password Policy
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SALT_ROUNDS: 12,
  },
  
  // Session Configuration
  SESSION: {
    COOKIE_SECURE: process.env.NODE_ENV === 'production',
    COOKIE_HTTP_ONLY: true,
    COOKIE_SAME_SITE: 'strict' as const,
    COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // CORS Configuration
  CORS: {
    ALLOWED_ORIGINS: [
      'http://localhost:3000',
      'https://algoqube.com',
      'https://client-algoqubeai.vercel.app',
    ],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    ALLOWED_HEADERS: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
    ],
    MAX_AGE: 86400, // 24 hours
  },
  
  // Content Security Policy
  CSP: {
    DIRECTIVES: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  
  // Security Headers
  HEADERS: {
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    SERVER: 'Algoqube-AI',
  },
  
  // Input Validation
  VALIDATION: {
    MAX_STRING_LENGTH: 1000,
    MAX_JSON_SIZE: '10mb',
    ALLOWED_FILE_TYPES: ['.txt', '.pdf', '.doc', '.docx'],
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  },
};

// Security utility functions
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}; 