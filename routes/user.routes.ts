import express from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  logoutUserLegacy,
  getUserActivity,
  updateProfile,
  changePassword,
  updateNotifications,
  getSettings,
  deactivateAccount,
  deleteAccount,
  getAvailablePlans,
  selectPlan,
  getTokenUsage,
  useTokens,
  initializeTokens,
  testTokenConsumption,
  testPlanUpdate,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/plans', getAvailablePlans);

// Protected routes (authentication required)
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logoutUser);
router.get('/activity', authenticate, getUserActivity);

// Settings routes (all require authentication)
router.get('/settings', authenticate, getSettings);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.put('/notifications', authenticate, updateNotifications);
router.put('/deactivate', authenticate, deactivateAccount);
router.delete('/account', authenticate, deleteAccount);

// Plan and token management routes
router.post('/select-plan', authenticate, selectPlan);
router.get('/token-usage', authenticate, getTokenUsage);
router.post('/use-tokens', authenticate, useTokens);
router.post('/initialize-tokens', authenticate, initializeTokens);
router.post('/test-token-consumption', authenticate, testTokenConsumption);
router.post('/test-plan-update', authenticate, testPlanUpdate);

export default router;