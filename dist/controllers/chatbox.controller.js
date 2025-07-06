"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateChatboxConfiguration = exports.getChatboxByName = exports.deleteChatbox = exports.updateChatbox = exports.getChatboxById = exports.getChatboxes = exports.createChatbox = void 0;
const axios_1 = __importDefault(require("axios"));
const chatbox_model_1 = __importDefault(require("../models/chatbox.model"));
const s3_1 = require("../utils/s3");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// 🧠 Helper to extract user from JWT (cookie or header)
const getUserFromRequest = (req) => {
    let token;
    // Try cookies first
    if (req.cookies?.token) {
        token = req.cookies.token;
        console.log('[Auth] Token found in cookie');
    }
    // Fallback to Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
        console.log('[Auth] Token found in Authorization header');
    }
    if (!token) {
        console.warn('[Auth] No token found in request');
        throw new Error('Unauthorized: No token');
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log('[Auth] Token verified. User ID:', decoded.id);
        return decoded.id;
    }
    catch (err) {
        console.error('[Auth] Invalid token', err);
        throw new Error('Unauthorized: Invalid token');
    }
};
// 🆕 Create chatbox
const createChatbox = async (req, res) => {
    try {
        const userId = getUserFromRequest(req);
        console.log('[CreateChatbox] User ID:', userId);
        const existing = await chatbox_model_1.default.findOne({ createdBy: userId });
        if (existing) {
            return res.status(400).json({ error: 'You already created a chatbot' });
        }
        const { organizationName, category, domainUrl, customContent, status, textFont, themeColor, displayName, } = req.body;
        if (!organizationName) {
            return res.status(400).json({ error: 'organizationName is required' });
        }
        const filename = `${organizationName}-${Date.now()}.txt`;
        const s3Url = await (0, s3_1.uploadTextToS3)(filename.replace('.txt', ''), customContent || '');
        const newChatbox = await chatbox_model_1.default.create({
            name: filename.replace('.txt', ''),
            organizationName,
            category,
            domainUrl,
            status: status || 'active',
            customContent,
            ocrData: '',
            scrapedData: '',
            createdBy: userId,
            configuration: {
                textFont,
                themeColor,
                displayName,
                profileAvatar: '',
            },
        });
        try {
            await axios_1.default.post('https://sangam.xendrax.in/webhook/226d2eb3-8b2f-45fe-8c1f-eaa8276ae849', {
                filename,
            });
        }
        catch (webhookErr) {
            console.warn('[Webhook Warning]', webhookErr instanceof Error ? webhookErr.message : webhookErr);
        }
        res.status(201).json({
            message: 'Chatbox created',
            chatbox: newChatbox,
            contentFileUrl: s3Url,
        });
    }
    catch (err) {
        console.error('[Create Chatbox Error]', err);
        res.status(401).json({ error: err.message || 'Failed to create chatbox' });
    }
};
exports.createChatbox = createChatbox;
// 🔄 Get user's chatbox
const getChatboxes = async (req, res) => {
    try {
        const userId = getUserFromRequest(req);
        console.log('[GetChatboxes] User ID:', userId);
        const chatbox = await chatbox_model_1.default.findOne({ createdBy: userId }).sort({ createdAt: -1 }).populate('createdBy');
        if (!chatbox) {
            console.log('[GetChatboxes] No chatbox found');
            return res.json(null);
        }
        res.json(chatbox);
    }
    catch (err) {
        console.error('[Get Chatboxes Error]', err);
        res.status(401).json({ error: err.message || 'Failed to fetch chatbox' });
    }
};
exports.getChatboxes = getChatboxes;
// 🔍 Get chatbox by ID with auth check
const getChatboxById = async (req, res) => {
    try {
        const userId = getUserFromRequest(req);
        console.log('[GetChatboxById] User ID:', userId, 'Chatbox ID:', req.params.id);
        const chatbox = await chatbox_model_1.default.findById(req.params.id).populate('createdBy');
        if (!chatbox || chatbox.createdBy._id.toString() !== userId) {
            console.warn('[GetChatboxById] Access denied for user:', userId);
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }
        res.json(chatbox);
    }
    catch (err) {
        console.error('[Get Chatbox By ID Error]', err);
        res.status(401).json({ error: err.message || 'Failed to fetch chatbox' });
    }
};
exports.getChatboxById = getChatboxById;
// ✏️ Update chatbox
const updateChatbox = async (req, res) => {
    try {
        const userId = getUserFromRequest(req);
        const { customContent } = req.body;
        console.log('[UpdateChatbox] User ID:', userId, 'Chatbox ID:', req.params.id);
        const chatbox = await chatbox_model_1.default.findById(req.params.id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            console.warn('[UpdateChatbox] Unauthorized update attempt by user:', userId);
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }
        if (customContent !== undefined) {
            const filename = chatbox.name;
            await (0, s3_1.uploadTextToS3)(filename, customContent);
            try {
                await axios_1.default.post('https://sangam.xendrax.in/webhook/226d2eb3-8b2f-45fe-8c1f-eaa8276ae849', {
                    filename: `${filename}.txt`,
                });
            }
            catch (webhookErr) {
                console.warn('[Webhook Warning]', webhookErr instanceof Error ? webhookErr.message : webhookErr);
            }
        }
        const updated = await chatbox_model_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        }).populate('createdBy');
        res.json({ message: 'Updated successfully', chatbox: updated });
    }
    catch (err) {
        console.error('[Update Chatbox Error]', err);
        res.status(401).json({ error: err.message || 'Failed to update chatbox' });
    }
};
exports.updateChatbox = updateChatbox;
// ❌ Delete chatbox
const deleteChatbox = async (req, res) => {
    try {
        const userId = getUserFromRequest(req);
        console.log('[DeleteChatbox] User ID:', userId, 'Chatbox ID:', req.params.id);
        const chatbox = await chatbox_model_1.default.findById(req.params.id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            console.warn('[DeleteChatbox] Unauthorized delete attempt by user:', userId);
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }
        await chatbox_model_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    }
    catch (err) {
        console.error('[Delete Chatbox Error]', err);
        res.status(401).json({ error: err.message || 'Failed to delete chatbox' });
    }
};
exports.deleteChatbox = deleteChatbox;
// 🔍 Get chatbox by name (publicly accessible)
const getChatboxByName = async (req, res) => {
    const nameParam = req.params.name;
    console.log('[ROUTE HIT] by-name:', nameParam);
    try {
        const chatbox = await chatbox_model_1.default.findOne({
            name: new RegExp(`^${nameParam}$`, 'i'),
        }).populate('createdBy');
        if (!chatbox) {
            console.warn('[NOT FOUND] Chatbox not found:', nameParam);
            return res.status(404).json({ message: 'Chatbox not found' });
        }
        res.json({ chatbox });
    }
    catch (err) {
        console.error('[ERROR] getChatboxByName:', err);
        res.status(500).json({ error: 'Failed to fetch chatbox by name' });
    }
};
exports.getChatboxByName = getChatboxByName;
// 🎯 Update ONLY the configuration object
const updateChatboxConfiguration = async (req, res) => {
    try {
        const userId = getUserFromRequest(req);
        const { id } = req.params;
        const { configuration } = req.body;
        if (!configuration || typeof configuration !== 'object') {
            return res.status(400).json({ error: 'Missing or invalid configuration data' });
        }
        const chatbox = await chatbox_model_1.default.findById(id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        chatbox.configuration = {
            ...chatbox.configuration,
            ...configuration,
        };
        await chatbox.save();
        res.json({ message: 'Configuration updated successfully', configuration: chatbox.configuration });
    }
    catch (err) {
        console.error('[Update Config Error]', err);
        res.status(500).json({ error: err.message || 'Failed to update configuration' });
    }
};
exports.updateChatboxConfiguration = updateChatboxConfiguration;
