"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLead = exports.getLeads = exports.createLead = void 0;
const lead_model_1 = __importDefault(require("../models/lead.model"));
const chatbox_model_1 = __importDefault(require("../models/chatbox.model"));
const ALLOWED_STATUSES = ['new', 'in_progress', 'contacted', 'converted', 'closed'];
const createLead = async (req, res) => {
    try {
        const { chatboxId, name, email, phone, company, message, sourceMessage, conversationId, status, } = req.body;
        if (!chatboxId) {
            return res.status(400).json({ message: 'chatboxId is required' });
        }
        if (!name || !email || !phone || !company) {
            return res.status(400).json({ message: 'Missing required lead fields' });
        }
        // Try to find chatbox by _id first, then by name if _id lookup fails
        let chatbox = null;
        // Check if chatboxId is a valid MongoDB ObjectId (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(chatboxId);
        if (isValidObjectId) {
            chatbox = await chatbox_model_1.default.findById(chatboxId);
        }
        // If not found by _id or not a valid ObjectId, try to find by name
        if (!chatbox) {
            chatbox = await chatbox_model_1.default.findOne({ name: chatboxId, status: 'active' });
        }
        if (!chatbox) {
            return res.status(404).json({ message: 'Chatbot not found' });
        }
        const isChatboxActive = typeof chatbox.status === 'string'
            ? chatbox.status.trim().toLowerCase() === 'active'
            : false;
        if (!isChatboxActive) {
            console.warn(`[LeadController] Chatbot ${chatbox._id} is not active (status: ${chatbox.status}). Capturing lead regardless.`);
        }
        const lead = await lead_model_1.default.create({
            chatbox: chatbox._id,
            createdBy: chatbox.createdBy,
            chatbotName: chatbox.name,
            chatbotDisplayName: chatbox.configuration?.displayName,
            organizationName: chatbox.organizationName,
            name,
            email,
            phone,
            company,
            message,
            sourceMessage,
            conversationId,
            status: ALLOWED_STATUSES.includes(status) ? status : 'new',
        });
        await chatbox_model_1.default.findByIdAndUpdate(chatbox._id, {
            $inc: { 'analytics.leadsCollected': 1 },
            $set: { 'analytics.lastUpdated': new Date() },
        });
        res.status(201).json({ message: 'Lead captured successfully', leadId: lead._id });
    }
    catch (error) {
        console.error('[Create Lead Error]', error);
        res.status(500).json({ message: 'Failed to capture lead' });
    }
};
exports.createLead = createLead;
const getLeads = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { chatboxId } = req.query;
        const query = { createdBy: req.user.id };
        if (chatboxId) {
            query.chatbox = chatboxId;
        }
        const leads = await lead_model_1.default.find(query)
            .sort({ createdAt: -1 })
            .lean();
        res.json({ leads });
    }
    catch (error) {
        console.error('[Get Leads Error]', error);
        res.status(500).json({ message: 'Failed to fetch leads' });
    }
};
exports.getLeads = getLeads;
const updateLead = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        const updated = await lead_model_1.default.findOneAndUpdate({ _id: id, createdBy: req.user.id }, { status, updatedAt: new Date() }, { new: true });
        if (!updated) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        res.json({ message: 'Lead updated', lead: updated });
    }
    catch (error) {
        console.error('[Update Lead Error]', error);
        res.status(500).json({ message: 'Failed to update lead' });
    }
};
exports.updateLead = updateLead;
