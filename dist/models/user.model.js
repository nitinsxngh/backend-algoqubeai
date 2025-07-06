"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const UserSchema = new mongoose_1.default.Schema({
    name: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true },
    avatar: { type: String },
    address: { type: String },
    otp: { type: String },
    accountStatus: { type: String, enum: ['Verified', 'Not Verified'], default: 'Not Verified' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    role: { type: String, enum: ['Admin', 'User'], default: 'User' },
    plan: {
        name: { type: String, default: 'Free' },
        expiresOn: { type: Date },
    },
    lastLogin: {
        timestamp: { type: Date },
        ip: { type: String },
        location: { type: String },
        device: { type: String },
        status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
    },
    loginHistory: [
        {
            timestamp: Date,
            ip: String,
            location: String,
            device: String,
            status: String,
        },
    ],
    locale: { type: String, default: 'en-IN' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        productUpdates: { type: Boolean, default: true },
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model('User', UserSchema);
