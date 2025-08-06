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
  
  // Fetch fresh domains from database
  const dbDomains = await fetchDomainUrls();
  
  // Combine with static origins
  const staticOrigins: string[] = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://algoqube.com',
    'https://www.algoqube.com',
    'https://*.algoqube.com',
    'https://client-algoqubeai.vercel.app',
    'https://rococo-kashata-839276.netlify.app',
    'https://*.vercel.app',
  ];
  
  // Add environment variable if it exists
  if (process.env.FRONTEND_URL) {
    staticOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Add null for local file testing
  staticOrigins.push('null');
  
  // Update cache
  cachedDomains = [...new Set([...staticOrigins, ...dbDomains])];
  lastCacheUpdate = now;
  
  console.log('Updated CORS allowed origins:', cachedDomains);
  
  return cachedDomains;
}

// Dynamic CORS middleware
export const dynamicCors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowedOrigins = await getAllowedOrigins();
    
    const origin = req.headers.origin;
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return next();
    }
    
    // Check if origin is in allowed list (including wildcard patterns)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === origin) return true;
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*', '.*');
        const regex = new RegExp(pattern);
        return regex.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
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
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://algoqube.com',
    'https://www.algoqube.com',
    'https://*.algoqube.com',
    'https://client-algoqubeai.vercel.app',
    'https://rococo-kashata-839276.netlify.app',
    process.env.FRONTEND_URL,
    'null',
  ].filter((origin): origin is string => Boolean(origin)),
  credentials: true,
}); 