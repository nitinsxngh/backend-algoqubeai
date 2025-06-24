import express from 'express';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../controllers/user.controller';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', getCurrentUser);

export default router;