import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import userRoutes from './routes/user.routes';
import chatboxRoutes from './routes/chatbox.routes';
import embedRoutes from './routes/embed.routes';
import embedWebComponentRoutes from './routes/embed-webcomponent.routes';
import embedPopupRoutes from './routes/embed-popup.routes';
import chatWidgetRoutes from './routes/chat-widget.routes';
import scrapeRoutes from './routes/scrape.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import { dynamicCors } from './middleware/cors';

dotenv.config();

const app = express();

// Security headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Check if this is an embed-related route that needs to be frame-able
  const isEmbedRoute = req.path.startsWith('/embed') || 
                      req.path.startsWith('/chat-widget') || 
                      req.path.startsWith('/widget') ||
                      req.path.includes('embed.js') ||
                      req.path.includes('widget.js');
  
  // Set X-Frame-Options based on route type
  if (isEmbedRoute) {
    // Allow embedding for widget/embed routes
    res.header('X-Frame-Options', 'ALLOWALL');
  } else {
    // Prevent clickjacking for other routes
    res.header('X-Frame-Options', 'DENY');
  }
  
  // Prevent MIME type sniffing
  res.header('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.header('X-XSS-Protection', '1; mode=block');
  
  // Prevent referrer leakage
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy - more permissive for embed routes
  if (isEmbedRoute) {
    res.header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-src 'self' https:;");
  } else {
    res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
  }
  
  // Remove server information
  res.header('Server', 'Algoqube-AI');
  
  next();
});

// Dynamic CORS Setup
app.use(dynamicCors);

// Body parsing middleware with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/chatboxes', chatboxRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', scrapeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Static Embed Scripts
app.use(embedRoutes);
app.use(embedWebComponentRoutes);
app.use(embedPopupRoutes);
app.use(chatWidgetRoutes);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
  
  res.status(500).json({ 
    error: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

export default app;
