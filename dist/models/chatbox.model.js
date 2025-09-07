"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ChatboxSchema = new mongoose_1.default.Schema({
    name: { type: String, default: () => `Chatbox-${Date.now()}` },
    organizationLogo: String,
    organizationName: { type: String, required: true },
    category: { type: String, enum: ['Support', 'Sales', 'FAQ', 'Feedback'] },
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    domainUrl: String,
    scrapedData: String,
    ocrData: String,
    customContent: String,
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    configuration: {
        textFont: String,
        themeColor: String,
        displayName: String,
        profileAvatar: String,
    },
    analytics: {
        lastUpdated: Date,
        totalToken: { type: Number, default: 0 },
        totalTokenUsed: { type: Number, default: 0 },
        dailyUsage: [{ date: String, tokensUsed: Number }],
        websiteVisits: { type: Number, default: 0 },
        avgSessionTime: { type: Number, default: 0 },
        conversationsInitiated: { type: Number, default: 0 },
        totalConversations: { type: Number, default: 0 },
        avgConversationTime: { type: Number, default: 0 },
        leadsCollected: { type: Number, default: 0 },
    },
    conversations: [{
            id: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
            duration: { type: Number, default: 0 },
            messageCount: { type: Number, default: 0 },
            tokensUsed: { type: Number, default: 0 },
            messages: [{
                    role: { type: String, enum: ['user', 'bot'], required: true },
                    content: { type: String, required: true },
                    timestamp: { type: Date, default: Date.now },
                    tokensUsed: { type: Number, default: 0 }
                }],
            website: String,
            userAgent: String,
            ip: String,
            status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' }
        }]
}, { timestamps: true });
exports.default = mongoose_1.default.model('Chatbox', ChatboxSchema);
