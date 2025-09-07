"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const UserSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true },
    plan: {
        type: String,
        enum: ['free', 'starter', 'professional', 'enterprise'],
        default: 'free'
    },
    tokens: {
        allocated: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 0 }
    },
    planDetails: {
        name: { type: String, default: 'Free' },
        price: { type: Number, default: 0 },
        tokenLimit: { type: Number, default: 0 },
        features: [{ type: String }],
        startDate: { type: Date },
        endDate: { type: Date },
        isActive: { type: Boolean, default: true }
    },
    role: { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
    preferences: {
        notifications: {
            emailAlerts: { type: Boolean, default: true },
            usageReminders: { type: Boolean, default: false },
            productUpdates: { type: Boolean, default: false },
            updatedAt: { type: Date, default: Date.now }
        }
    },
    // Enhanced activity tracking
    activity: {
        lastLogin: {
            timestamp: { type: Date, default: Date.now },
            ip: { type: String },
            device: { type: String },
            browser: { type: String },
            os: { type: String },
            location: { type: String },
            userAgent: { type: String },
            status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
            sessionDuration: { type: Number },
            logoutReason: { type: String },
        },
        loginHistory: [{
                timestamp: { type: Date, default: Date.now },
                ip: { type: String },
                device: { type: String },
                browser: { type: String },
                os: { type: String },
                location: { type: String },
                userAgent: { type: String },
                status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
                sessionDuration: { type: Number },
                logoutReason: { type: String },
            }],
        sessionStats: {
            totalSessions: { type: Number, default: 0 },
            totalSessionTime: { type: Number, default: 0 },
            averageSessionTime: { type: Number, default: 0 },
            longestSession: { type: Number, default: 0 },
            lastActive: { type: Date },
        },
        securityEvents: [{
                timestamp: { type: Date, default: Date.now },
                type: { type: String },
                ip: { type: String },
                location: { type: String },
                device: { type: String },
                details: { type: String },
                severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
            }],
    },
    // Legacy fields for backward compatibility
    lastLogin: {
        timestamp: { type: Date, default: Date.now },
        ip: { type: String },
        device: { type: String },
        location: { type: String },
        status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
    },
    loginHistory: [{
            timestamp: { type: Date, default: Date.now },
            ip: { type: String },
            device: { type: String },
            location: { type: String },
            status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
        }],
    locale: { type: String, default: 'en-IN' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        productUpdates: { type: Boolean, default: true },
    },
}, {
    timestamps: true
});
// Index for better query performance
UserSchema.index({ 'activity.lastLogin.timestamp': -1 });
UserSchema.index({ 'activity.loginHistory.timestamp': -1 });
UserSchema.index({ 'activity.securityEvents.timestamp': -1 });
exports.default = mongoose_1.default.model('User', UserSchema);
