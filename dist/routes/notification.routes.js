"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = require("../controllers/notification.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Get user's notifications
router.get('/', notification_controller_1.getUserNotifications);
// Get unread count
router.get('/unread-count', notification_controller_1.getUnreadCount);
// Mark notification as read
router.patch('/:notificationId/read', notification_controller_1.markNotificationAsRead);
// Mark all notifications as read
router.patch('/mark-all-read', notification_controller_1.markAllNotificationsAsRead);
// Delete notification
router.delete('/:notificationId', notification_controller_1.deleteNotification);
exports.default = router;
