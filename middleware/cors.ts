import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import Chatbox from '../models/chatbox.model';

// Cache for domain URLs to avoid database queries on every request
let cachedDomains: string[] = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch all domain URLs from database
async function fetchDomainUrls(): Promise<string[]> {
  try {
    const chatboxes = await Chatbox.find({ 
      domainUrl: { $exists: true, $ne: null },
      status: 'active'
    }).select('domainUrl').lean();
    
    const domains: string[] = [];
    
    for (const chatbox of chatboxes) {
      const domainUrl = chatbox.domainUrl;
      if (domainUrl && typeof domainUrl === 'string' && domainUrl.trim() !== '') {
        // Ensure domain has protocol
        if (!domainUrl.startsWith('http://') && !domainUrl.startsWith('https://')) {
          domains.push(`https://${domainUrl}`);
        } else {
          domains.push(domainUrl);
        }
      }
    }
    
    return [...new Set(domains)]; // Remove duplicates
  } catch (error) {
    console.error('Error fetching domain URLs:', error);
    return [];
  }
}

// Function to get cached domains or fetch from database
export async function getAllowedOrigins(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached domains if still valid
  if (cachedDomains.length > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
    return cachedDomains;
  }
  
  // Static origins (always available)
  const staticOrigins: string[] = [
    'http://localhost:3000',
    'http://localhost:4000',
    'https://algoqube.com',
    'https://ai.algoqube.com',
    'https://client-algoqubeai.vercel.app',
    'https://rococo-kashata-839276.netlify.app',
    'https://polite-squirrel-5cbad7.netlify.app',
  ];
  
  // Add environment variable if it exists
  if (process.env.FRONTEND_URL) {
    staticOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Add null for local file testing
  staticOrigins.push('null');
  
  // Try to fetch fresh domains from database
  let dbDomains: string[] = [];
  try {
    dbDomains = await fetchDomainUrls();
  } catch (error) {
    console.warn('Failed to fetch domain URLs from database, using static origins only:', error);
    // If database fails, use only static origins
    cachedDomains = [...new Set(staticOrigins)];
    lastCacheUpdate = now;
    return cachedDomains;
  }
  
  // Update cache
  cachedDomains = [...new Set([...staticOrigins, ...dbDomains])];
  lastCacheUpdate = now;
  
  console.log('Updated CORS allowed origins:', cachedDomains);
  
  return cachedDomains;
}

// Dynamic CORS middleware
export const dynamicCors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const origin = req.headers.origin;
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return next();
    }
    
    // First check static origins (fast check)
    const staticOrigins = [
      'http://localhost:3000',
    'http://localhost:4000',
      'https://algoqube.com',
      'https://ai.algoqube.com',
      'https://client-algoqubeai.vercel.app',
      'https://rococo-kashata-839276.netlify.app',
      'https://polite-squirrel-5cbad7.netlify.app',
      process.env.FRONTEND_URL,
      'null',
    ].filter((origin): origin is string => Boolean(origin));
    
    const isStaticAllowed = staticOrigins.includes(origin) || 
                           origin.endsWith('.algoqube.com') || 
                           origin === 'https://algoqube.com';
    
    if (isStaticAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      
      return next();
    }
    
    // If not in static origins, try to get dynamic origins from database
    try {
      const allowedOrigins = await getAllowedOrigins();
      
      // Check if origin matches any database domain (with flexible matching)
      const isDynamicAllowed = allowedOrigins.some(allowedOrigin => {
        // Skip static origins (they don't start with http/https or are localhost)
        if (!allowedOrigin.startsWith('http://') && !allowedOrigin.startsWith('https://')) {
          return false;
        }
        
        // Normalize both URLs for comparison
        const normalizeUrl = (url: string) => {
          // Remove trailing slash and protocol for comparison
          return url.replace(/\/$/, '').replace(/^https?:\/\//, '');
        };
        
        const normalizedOrigin = normalizeUrl(origin);
        const normalizedAllowed = normalizeUrl(allowedOrigin);
        
        // Check if the domain matches (with or without www)
        return normalizedOrigin === normalizedAllowed || 
               normalizedOrigin === `www.${normalizedAllowed}` ||
               `www.${normalizedOrigin}` === normalizedAllowed;
      });
      
      if (isDynamicAllowed) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
          return;
        }
        
        return next();
      }
    } catch (dbError) {
      console.warn('Database error in CORS middleware, falling back to static origins only:', dbError);
    }
    
    // Origin not allowed
    console.warn(`CORS blocked origin: ${origin}`);
    res.status(403).json({ error: 'Origin not allowed by CORS policy' });
    
  } catch (error) {
    console.error('CORS middleware error:', error);
    // Fallback to basic CORS for error cases
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
  }
};

// Function to manually refresh CORS cache (useful for admin endpoints)
export const refreshCorsCache = async (): Promise<void> => {
  lastCacheUpdate = 0; // Force cache refresh
  await getAllowedOrigins();
};

// Export the original cors function for backward compatibility
export const staticCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
    'http://localhost:4000',
      'https://algoqube.com',
      'https://ai.algoqube.com',
      'https://client-algoqubeai.vercel.app',
      'https://rococo-kashata-839276.netlify.app',
      'https://polite-squirrel-5cbad7.netlify.app',
      process.env.FRONTEND_URL,
      'null',
    ].filter((origin): origin is string => Boolean(origin));
    
    // Check if origin is in allowed list or is an algoqube.com subdomain
    const isAllowed = allowedOrigins.includes(origin) || 
                     origin.endsWith('.algoqube.com') || 
                     origin === 'https://algoqube.com';
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}); 