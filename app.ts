import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import userRoutes from './routes/user.routes';
import chatboxRoutes from './routes/chatbox.routes';
import embedRoutes from './routes/embed.routes';
import chatWidgetRoutes from './routes/chat-widget.routes';

dotenv.config();

const app = express();

// --- CORS Setup ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://algoqube.com',
  'https://client-algoqubeai.vercel.app',
  'null', // For local file:// testing
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // 🔒 Send cookies
  })
);

// --- Middleware ---
app.use(express.json());
app.use(cookieParser());

// --- API Routes ---
app.use('/api/users', userRoutes);
app.use('/api/chatboxes', chatboxRoutes);

// --- Static Embed Scripts ---
app.use(embedRoutes);       // e.g., GET /embed.js
app.use(chatWidgetRoutes);  // e.g., GET /chat-widget

// --- Error Handling Middleware ---
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
