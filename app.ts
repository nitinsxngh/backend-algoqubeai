import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import userRoutes from './routes/user.routes';
import chatboxRoutes from './routes/chatbox.routes';
import embedRoutes from './routes/embed.routes';
import chatWidgetRoutes from './routes/chat-widget.routes'; // 👈 Make sure this exists

const app = express();

// --- CORS Setup ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://algoqube.com',
  'https://client-algoqubeai.vercel.app/',
  'null', // for file:// access to test locally
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
    credentials: true,
  })
);

// --- Body Parser ---
app.use(express.json());

// --- Cookie Parser ---
app.use(cookieParser());

// --- API Routes ---
app.use('/api/users', userRoutes);
app.use('/api/chatboxes', chatboxRoutes);

// --- Embed + Chat Widget Routes ---
app.use(embedRoutes);       // Serves /embed.js
app.use(chatWidgetRoutes);  // Serves /chat-widget

export default app;
