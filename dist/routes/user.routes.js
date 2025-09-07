"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes (no authentication required)
router.post('/register', user_controller_1.registerUser);
router.post('/login', user_controller_1.loginUser);
router.get('/plans', user_controller_1.getAvailablePlans);
// Protected routes (authentication required)
router.get('/me', auth_1.authenticate, user_controller_1.getCurrentUser);
router.post('/logout', auth_1.authenticate, user_controller_1.logoutUser);
router.get('/activity', auth_1.authenticate, user_controller_1.getUserActivity);
// Settings routes (all require authentication)
router.get('/settings', auth_1.authenticate, user_controller_1.getSettings);
router.put('/profile', auth_1.authenticate, user_controller_1.updateProfile);
router.put('/password', auth_1.authenticate, user_controller_1.changePassword);
router.put('/notifications', auth_1.authenticate, user_controller_1.updateNotifications);
router.put('/deactivate', auth_1.authenticate, user_controller_1.deactivateAccount);
router.delete('/account', auth_1.authenticate, user_controller_1.deleteAccount);
// Plan and token management routes
router.post('/select-plan', auth_1.authenticate, user_controller_1.selectPlan);
router.get('/token-usage', auth_1.authenticate, user_controller_1.getTokenUsage);
router.post('/use-tokens', auth_1.authenticate, user_controller_1.useTokens);
router.post('/initialize-tokens', auth_1.authenticate, user_controller_1.initializeTokens);
router.post('/test-token-consumption', auth_1.authenticate, user_controller_1.testTokenConsumption);
router.post('/test-plan-update', auth_1.authenticate, user_controller_1.testPlanUpdate);
exports.default = router;
