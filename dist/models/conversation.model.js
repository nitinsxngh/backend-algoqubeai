"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ConversationSchema = new mongoose_1.default.Schema({
    // Reference to the chatbox this conversation belongs to
    chatboxId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Chatbox',
        required: true
    },
    // Chatbox name for easier querying
    chatboxName: {
        type: String,
        required: true,
        index: true
    },
    // Unique conversation identifier
    conversationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Conversation metadata
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    duration: {
        type: Number,
        default: 0
    },
    messageCount: {
        type: Number,
        default: 0
    },
    tokensUsed: {
        type: Number,
        default: 0
    },
    // Array of messages in this conversation
    messages: [{
            role: {
                type: String,
                enum: ['user', 'bot'],
                required: true
            },
            content: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            tokensUsed: {
                type: Number,
                default: 0
            }
        }],
    // User session information
    website: {
        type: String,
        default: 'unknown'
    },
    userAgent: {
        type: String,
        default: 'unknown'
    },
    ip: {
        type: String,
        default: 'unknown'
    },
    // Conversation status
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active',
        index: true
    },
    // User information (if available)
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Additional metadata
    metadata: {
        type: Map,
        of: mongoose_1.default.Schema.Types.Mixed,
        default: new Map()
    }
}, {
    timestamps: true
});
// Indexes for better query performance
ConversationSchema.index({ chatboxId: 1, timestamp: -1 });
ConversationSchema.index({ chatboxName: 1, timestamp: -1 });
ConversationSchema.index({ status: 1, timestamp: -1 });
ConversationSchema.index({ userId: 1, timestamp: -1 });
ConversationSchema.index({ timestamp: -1 });
// Virtual for conversation duration in minutes
ConversationSchema.virtual('durationMinutes').get(function () {
    return Math.round(this.duration / 60 * 100) / 100;
});
// Virtual for average tokens per message
ConversationSchema.virtual('avgTokensPerMessage').get(function () {
    return this.messageCount > 0 ? Math.round(this.tokensUsed / this.messageCount * 100) / 100 : 0;
});
// Method to add a message to the conversation
ConversationSchema.methods.addMessage = function (role, content, tokensUsed = 0) {
    this.messages.push({
        role,
        content,
        timestamp: new Date(),
        tokensUsed
    });
    this.messageCount = this.messages.length;
    this.tokensUsed += tokensUsed;
    return this.save();
};
// Method to update conversation status
ConversationSchema.methods.updateStatus = function (status) {
    this.status = status;
    if (status === 'completed' && this.duration === 0) {
        const startTime = new Date(this.timestamp);
        const endTime = new Date();
        this.duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    }
    return this.save();
};
// Static method to get conversations by chatbox
ConversationSchema.statics.getByChatbox = function (chatboxName, options = {}) {
    const query = { chatboxName };
    if (options.status && options.status !== 'all') {
        query.status = options.status;
    }
    if (options.startDate || options.endDate) {
        query.timestamp = {};
        if (options.startDate)
            query.timestamp.$gte = new Date(options.startDate);
        if (options.endDate)
            query.timestamp.$lte = new Date(options.endDate);
    }
    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(options.limit || 20)
        .skip(options.skip || 0);
};
// Static method to get conversation statistics
ConversationSchema.statics.getStats = function (chatboxName, options = {}) {
    const matchQuery = { chatboxName };
    if (options.startDate || options.endDate) {
        matchQuery.timestamp = {};
        if (options.startDate)
            matchQuery.timestamp.$gte = new Date(options.startDate);
        if (options.endDate)
            matchQuery.timestamp.$lte = new Date(options.endDate);
    }
    return this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalConversations: { $sum: 1 },
                activeConversations: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                completedConversations: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                abandonedConversations: {
                    $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] }
                },
                totalMessages: { $sum: '$messageCount' },
                totalTokens: { $sum: '$tokensUsed' },
                avgDuration: { $avg: '$duration' },
                avgMessagesPerConversation: { $avg: '$messageCount' }
            }
        }
    ]);
};
exports.default = mongoose_1.default.model('Conversation', ConversationSchema);
