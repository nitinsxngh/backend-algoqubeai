import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.routes';
import chatboxRoutes from './routes/chatbox.routes';

const app = express();

// --- CORS Setup ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://algoqube.com',
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // enable cookie passing
  })
);

// --- Body Parser ---
app.use(express.json());

// --- Cookie Parser (required for JWT middleware if used later) ---
app.use(cookieParser());

// --- User Routes ---
app.use('/api/users', userRoutes);
app.use('/api/chatboxes', chatboxRoutes);

export default app;
