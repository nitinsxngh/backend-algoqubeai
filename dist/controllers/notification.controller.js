"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.createNotification = exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = void 0;
const notification_model_1 = __importDefault(require("../models/notification.model"));
// Get user's notifications
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const query = { userId };
        if (unreadOnly === 'true') {
            query.read = false;
        }
        const notifications = await notification_model_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await notification_model_1.default.countDocuments(query);
        const unreadCount = await notification_model_1.default.countDocuments({ userId, read: false });
        res.json({
            notifications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            },
            unreadCount
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};
exports.getUserNotifications = getUserNotifications;
// Mark notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { notificationId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const notification = await notification_model_1.default.findOneAndUpdate({ _id: notificationId, userId }, { read: true }, { new: true });
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ success: true, notification });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await notification_model_1.default.updateMany({ userId, read: false }, { read: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { notificationId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const notification = await notification_model_1.default.findOneAndDelete({
            _id: notificationId,
            userId
        });
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ success: true, message: 'Notification deleted' });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};
exports.deleteNotification = deleteNotification;
// Create notification (internal use)
const createNotification = async (userId, title, message, type = 'info', data) => {
    try {
        const notification = new notification_model_1.default({
            userId,
            title,
            message,
            type,
            data
        });
        await notification.save();
        return notification;
    }
    catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};
exports.createNotification = createNotification;
// Get unread count for real-time updates
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const unreadCount = await notification_model_1.default.countDocuments({ userId, read: false });
        res.json({ unreadCount });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
};
exports.getUnreadCount = getUnreadCount;
