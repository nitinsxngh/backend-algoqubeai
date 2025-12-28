"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePredefinedQuestion = exports.updatePredefinedQuestion = exports.addPredefinedQuestion = exports.getPredefinedQuestions = exports.uploadDocumentForCreation = exports.uploadDocument = exports.uploadOrganizationImage = exports.decryptEmail = exports.encryptEmail = exports.incrementWebsiteVisits = exports.analyzeWebsiteColors = exports.updateChatboxConfiguration = exports.getChatboxByName = exports.deleteChatbox = exports.updateChatbox = exports.getChatboxById = exports.getChatboxes = exports.createChatbox = void 0;
const axios_1 = __importDefault(require("axios"));
const chatbox_model_1 = __importDefault(require("../models/chatbox.model"));
const s3_1 = require("../utils/s3");
const documentParser_1 = require("../utils/documentParser");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cors_1 = require("../middleware/cors");
const notification_controller_1 = require("./notification.controller");
// 🆕 Create chatbox
const createChatbox = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        console.log('[CreateChatbox] User ID:', userId);
        const existing = await chatbox_model_1.default.findOne({ createdBy: userId });
        if (existing) {
            return res.status(400).json({ error: 'You already created a chatbot' });
        }
        const { organizationName, category, domainUrl, customContent, status, textFont, themeColor, displayName, organizationLogo, } = req.body;
        if (!organizationName) {
            return res.status(400).json({ error: 'organizationName is required' });
        }
        const filename = `${organizationName}-${Date.now()}.txt`;
        const s3Url = await (0, s3_1.uploadTextToS3)(filename.replace('.txt', ''), customContent || '');
        const newChatbox = await chatbox_model_1.default.create({
            name: filename.replace('.txt', ''),
            organizationName,
            organizationLogo: organizationLogo || '',
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
                profileAvatar: organizationLogo || '',
            },
        });
        // Refresh CORS cache if domainUrl was provided
        if (domainUrl) {
            try {
                await (0, cors_1.refreshCorsCache)();
                console.log('[CreateChatbox] CORS cache refreshed after new domain URL');
            }
            catch (corsError) {
                console.warn('[CreateChatbox] Failed to refresh CORS cache:', corsError);
            }
        }
        try {
            await axios_1.default.post('https://workflow.algoqube.com/webhook/226d2eb3-8b2f-45fe-8c1f-eaa8276ae849', {
                filename,
            });
        }
        catch (webhookErr) {
            console.warn('[Webhook Warning]', webhookErr instanceof Error ? webhookErr.message : webhookErr);
        }
        // Create success notification
        try {
            await (0, notification_controller_1.createNotification)(userId, 'Chatbot Created Successfully', `Your AI assistant "${organizationName}" has been deployed successfully.`, 'success', { chatboxId: newChatbox._id, organizationName });
        }
        catch (notificationErr) {
            console.warn('[Notification Warning]', notificationErr);
        }
        res.status(201).json({
            message: 'Chatbox created',
            chatbox: newChatbox,
            contentFileUrl: s3Url,
        });
    }
    catch (err) {
        console.error('[Create Chatbox Error]', err);
        res.status(500).json({ error: err.message || 'Failed to create chatbox' });
    }
};
exports.createChatbox = createChatbox;
// 🔄 Get user's chatbox
const getChatboxes = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
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
        res.status(500).json({ error: err.message || 'Failed to fetch chatbox' });
    }
};
exports.getChatboxes = getChatboxes;
// 🔍 Get chatbox by ID with auth check
const getChatboxById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
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
        res.status(500).json({ error: err.message || 'Failed to fetch chatbox' });
    }
};
exports.getChatboxById = getChatboxById;
// ✏️ Update chatbox
const updateChatbox = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { customContent, organizationLogo } = req.body;
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
                await axios_1.default.post('https://workflow.algoqube.com/webhook/226d2eb3-8b2f-45fe-8c1f-eaa8276ae849', {
                    filename: `${filename}.txt`,
                });
            }
            catch (webhookErr) {
                console.warn('[Webhook Warning]', webhookErr instanceof Error ? webhookErr.message : webhookErr);
            }
        }
        // Handle organization logo update
        if (organizationLogo !== undefined) {
            req.body.organizationLogo = organizationLogo;
            // Also update the profileAvatar in configuration
            if (!req.body.configuration) {
                req.body.configuration = {};
            }
            req.body.configuration.profileAvatar = organizationLogo;
        }
        const updated = await chatbox_model_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        }).populate('createdBy');
        // Refresh CORS cache if domainUrl was updated
        if (req.body.domainUrl !== undefined) {
            try {
                await (0, cors_1.refreshCorsCache)();
                console.log('[UpdateChatbox] CORS cache refreshed after domain URL update');
            }
            catch (corsError) {
                console.warn('[UpdateChatbox] Failed to refresh CORS cache:', corsError);
            }
        }
        res.json({ message: 'Updated successfully', chatbox: updated });
    }
    catch (err) {
        console.error('[Update Chatbox Error]', err);
        res.status(500).json({ error: err.message || 'Failed to update chatbox' });
    }
};
exports.updateChatbox = updateChatbox;
//  Delete chatbox
const deleteChatbox = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
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
        res.status(500).json({ error: err.message || 'Failed to delete chatbox' });
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
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
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
// 🎨 Analyze website colors from screenshot
const analyzeWebsiteColors = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid URL parameter' });
        }
        // Validate URL format
        let validUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            validUrl = `https://${url}`;
        }
        try {
            new URL(validUrl);
        }
        catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        console.log(`Starting color analysis for URL: ${validUrl}`);
        // Import required modules
        const puppeteer = require('puppeteer');
        const { createCanvas, loadImage } = require('canvas');
        let browser;
        try {
            // Launch browser
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            const page = await browser.newPage();
            // Set viewport
            await page.setViewport({ width: 1920, height: 1080 });
            // Set user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            // Navigate to page
            await page.goto(validUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Take screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: false // Only visible area
            });
            // Get CSS colors from the page
            const cssColors = await page.evaluate(() => {
                const styles = Array.from(document.styleSheets)
                    .map(sheet => {
                    try {
                        return Array.from(sheet.cssRules)
                            .map(rule => rule.cssText)
                            .join('\n');
                    }
                    catch (e) {
                        return '';
                    }
                })
                    .join('\n');
                return styles;
            });
            // Extract colors from CSS
            const extractCssColors = (cssText) => {
                const colors = [];
                // Match hex colors
                const hexMatches = cssText.match(/#[0-9a-fA-F]{3,6}/g) || [];
                colors.push(...hexMatches);
                // Match rgb/rgba colors
                const rgbMatches = cssText.match(/rgba?\([^)]+\)/g) || [];
                colors.push(...rgbMatches);
                return [...new Set(colors)]; // Remove duplicates
            };
            const extractedCssColors = extractCssColors(cssColors);
            // Convert screenshot to image data for analysis
            const canvas = createCanvas(1920, 1080);
            const ctx = canvas.getContext('2d');
            // Load screenshot
            const image = await loadImage(screenshot);
            ctx.drawImage(image, 0, 0);
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Analyze colors from image data
            const analyzeImageColors = (imageData, width, height) => {
                const colorMap = new Map();
                const totalPixels = width * height;
                // Sample pixels (every 10th pixel to improve performance)
                const sampleRate = 10;
                for (let i = 0; i < totalPixels; i += sampleRate) {
                    const pixelIndex = i * 4;
                    const r = imageData[pixelIndex];
                    const g = imageData[pixelIndex + 1];
                    const b = imageData[pixelIndex + 2];
                    const a = imageData[pixelIndex + 3];
                    // Skip transparent pixels
                    if (a < 128)
                        continue;
                    // Skip very light or very dark pixels (likely backgrounds)
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    if (brightness < 30 || brightness > 240)
                        continue;
                    const hexColor = '#' + [r, g, b].map(x => {
                        const hex = x.toString(16);
                        return hex.length === 1 ? '0' + hex : hex;
                    }).join('');
                    colorMap.set(hexColor, (colorMap.get(hexColor) || 0) + 1);
                }
                // Convert to array and sort by frequency
                return Array.from(colorMap.entries())
                    .map(([color, frequency]) => ({ color, frequency }))
                    .sort((a, b) => b.frequency - a.frequency)
                    .slice(0, 20) // Increased to top 20 colors
                    .map(item => item.color);
            };
            const dominantColors = analyzeImageColors(imageData.data, canvas.width, canvas.height);
            // Combine all colors and filter for good theme colors
            const allColors = [...new Set([...dominantColors, ...extractedCssColors])];
            // Filter colors for good theme candidates (avoid very light/dark colors)
            const themeColors = allColors.filter(color => {
                if (color.startsWith('#')) {
                    const r = parseInt(color.slice(1, 3), 16);
                    const g = parseInt(color.slice(3, 5), 16);
                    const b = parseInt(color.slice(5, 7), 16);
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    return brightness > 40 && brightness < 220; // Wider brightness range for more options
                }
                return true; // Keep non-hex colors
            }).slice(0, 12); // Increased to 12 colors
            console.log(`Color analysis completed. Found ${themeColors.length} theme colors.`);
            return res.status(200).json({
                colors: themeColors,
                method: 'screenshot-analysis',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Screenshot analysis failed:', error);
            // Fallback to hash-based color generation
            const hash = validUrl.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            const baseHue = Math.abs(hash) % 360;
            const fallbackColors = [
                `hsl(${baseHue}, 70%, 50%)`,
                `hsl(${(baseHue + 180) % 360}, 70%, 50%)`,
                `hsl(${(baseHue + 30) % 360}, 70%, 50%)`,
            ].map(hslColor => {
                const hsl = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                if (!hsl)
                    return '#6366f1';
                const h = parseInt(hsl[1]);
                const s = parseInt(hsl[2]);
                const l = parseInt(hsl[3]);
                const hue = h / 360;
                const sat = s / 100;
                const light = l / 100;
                const hueToRgb = (p, q, t) => {
                    if (t < 0)
                        t += 1;
                    if (t > 1)
                        t -= 1;
                    if (t < 1 / 6)
                        return p + (q - p) * 6 * t;
                    if (t < 1 / 2)
                        return q;
                    if (t < 2 / 3)
                        return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                let r, g, b;
                if (sat === 0) {
                    r = g = b = light;
                }
                else {
                    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
                    const p = 2 * light - q;
                    r = hueToRgb(p, q, hue + 1 / 3);
                    g = hueToRgb(p, q, hue);
                    b = hueToRgb(p, q, hue - 1 / 3);
                }
                const toHex = (c) => {
                    const hex = Math.round(c * 255).toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                };
                return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
            });
            return res.status(200).json({
                colors: fallbackColors,
                method: 'fallback-hash',
                timestamp: new Date().toISOString()
            });
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    catch (error) {
        console.error('Color analysis error:', error);
        return res.status(500).json({ error: 'Color analysis failed' });
    }
};
exports.analyzeWebsiteColors = analyzeWebsiteColors;
// 📊 Increment website visits for analytics
const incrementWebsiteVisits = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Missing chatbot name' });
        const chatbox = await chatbox_model_1.default.findOne({ name });
        if (!chatbox)
            return res.status(404).json({ error: 'Chatbox not found' });
        if (!chatbox.analytics || typeof chatbox.analytics !== 'object') {
            chatbox.analytics = {
                totalToken: 0,
                totalTokenUsed: 0,
                dailyUsage: [],
                websiteVisits: 0,
                avgSessionTime: 0,
                conversationsInitiated: 0,
                totalConversations: 0,
                avgConversationTime: 0,
                leadsCollected: 0,
                lastUpdated: new Date(),
            };
        }
        if (chatbox.analytics && typeof chatbox.analytics.websiteVisits !== 'number') {
            chatbox.analytics.websiteVisits = 0;
        }
        if (chatbox.analytics) {
            chatbox.analytics.websiteVisits += 1;
            chatbox.analytics.lastUpdated = new Date();
            chatbox.markModified('analytics');
        }
        await chatbox.save();
        res.json({ message: 'Visit counted', websiteVisits: chatbox.analytics ? chatbox.analytics.websiteVisits : 0 });
    }
    catch (err) {
        console.error('[Increment Website Visits Error]', err);
        res.status(500).json({ error: 'Failed to increment website visits' });
    }
};
exports.incrementWebsiteVisits = incrementWebsiteVisits;
/**
 * POST /api/chatboxes/encrypt-email
 * Encrypt email and return a token for use in URLs
 */
const encryptEmail = async (req, res) => {
    try {
        const { email, chatboxId } = req.body;
        if (!email || !chatboxId) {
            return res.status(400).json({ error: 'Email and chatboxId are required' });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        // Use JWT to create an encrypted token (expires in 7 days)
        const secret = process.env.JWT_SECRET || 'fallback-secret-key';
        const token = jsonwebtoken_1.default.sign({ email, chatboxId, timestamp: Date.now() }, secret, { expiresIn: '7d' });
        return res.json({ token });
    }
    catch (err) {
        console.error('[Encrypt Email Error]', err);
        res.status(500).json({ error: 'Failed to encrypt email' });
    }
};
exports.encryptEmail = encryptEmail;
/**
 * GET /api/chatboxes/decrypt-email/:token
 * Decrypt token and return email (for validation/internal use)
 */
const decryptEmail = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        const secret = process.env.JWT_SECRET || 'fallback-secret-key';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        return res.json({
            email: decoded.email,
            chatboxId: decoded.chatboxId,
            valid: true
        });
    }
    catch (err) {
        console.error('[Decrypt Email Error]', err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.decryptEmail = decryptEmail;
/**
 * POST /api/chatboxes/:id/upload-image
 * Upload organization image to S3 and update chatbox
 */
const uploadOrganizationImage = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const chatbox = await chatbox_model_1.default.findById(id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Upload image to S3
        const imageUrl = await (0, s3_1.uploadImageToS3)(req.file, chatbox.organizationName);
        // Update chatbox with image URL
        chatbox.organizationLogo = imageUrl;
        if (!chatbox.configuration) {
            chatbox.configuration = {
                textFont: 'Inter',
                themeColor: '#6366f1',
                displayName: chatbox.organizationName,
                profileAvatar: imageUrl,
            };
        }
        else {
            chatbox.configuration.profileAvatar = imageUrl;
        }
        await chatbox.save();
        res.json({
            message: 'Image uploaded successfully',
            imageUrl,
            chatbox,
        });
    }
    catch (err) {
        console.error('[Upload Image Error]', err);
        res.status(500).json({ error: err.message || 'Failed to upload image' });
    }
};
exports.uploadOrganizationImage = uploadOrganizationImage;
/**
 * POST /api/chatboxes/:id/upload-document
 * Upload document (PDF/Word) to S3, extract text, and update chatbox customContent
 */
const uploadDocument = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { id } = req.params;
        // Handle multer array response - can be array or object
        let files = [];
        if (req.files) {
            if (Array.isArray(req.files)) {
                files = req.files;
            }
            else if (typeof req.files === 'object' && 'documents' in req.files && Array.isArray(req.files.documents)) {
                files = req.files.documents;
            }
        }
        else if (req.file) {
            files = [req.file];
        }
        if (files.length === 0) {
            return res.status(400).json({ error: 'No document files provided' });
        }
        const chatbox = await chatbox_model_1.default.findById(id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const documentUrls = [];
        const extractedTexts = [];
        const errors = [];
        // Process all uploaded documents
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Upload document to S3
                const documentUrl = await (0, s3_1.uploadDocumentToS3)(file, chatbox.organizationName);
                documentUrls.push(documentUrl);
                // Extract text from document
                try {
                    const extractedText = await (0, documentParser_1.extractDocumentText)(file);
                    if (extractedText.trim()) {
                        extractedTexts.push(`--- Document ${i + 1}: ${file.originalname} ---\n${extractedText}`);
                    }
                }
                catch (extractError) {
                    console.error(`[Document Extraction Error] ${file.originalname}:`, extractError);
                    errors.push(`${file.originalname}: Failed to extract text`);
                    // Continue even if extraction fails - document is still uploaded
                }
            }
            catch (uploadError) {
                console.error(`[Document Upload Error] ${file.originalname}:`, uploadError);
                errors.push(`${file.originalname}: ${uploadError.message || 'Upload failed'}`);
            }
        }
        // Merge all extracted texts
        const allExtractedText = extractedTexts.join('\n\n');
        // Merge with existing customContent
        const existingContent = chatbox.customContent || '';
        const mergedContent = existingContent && allExtractedText
            ? `${existingContent}\n\n${allExtractedText}`
            : existingContent || allExtractedText;
        // Update chatbox with merged content
        if (allExtractedText) {
            chatbox.customContent = mergedContent.trim();
            await chatbox.save();
            // Update S3 text file with merged content
            try {
                const filename = `${chatbox.name}.txt`;
                await (0, s3_1.uploadTextToS3)(filename.replace('.txt', ''), chatbox.customContent);
            }
            catch (s3Error) {
                console.warn('[S3 Text Update Warning]', s3Error);
            }
        }
        res.json({
            message: `${files.length} document(s) processed`,
            documentUrls,
            extractedTextLength: allExtractedText.length,
            documentsProcessed: documentUrls.length,
            errors: errors.length > 0 ? errors : undefined,
            customContent: chatbox.customContent,
        });
    }
    catch (err) {
        console.error('[Upload Document Error]', err);
        res.status(500).json({ error: err.message || 'Failed to upload documents' });
    }
};
exports.uploadDocument = uploadDocument;
/**
 * POST /api/chatboxes/upload-document
 * Upload document during chatbox creation (before chatbox exists)
 * Returns extracted text to be merged with customContent
 */
const uploadDocumentForCreation = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Handle multer array response - can be array or object
        let files = [];
        if (req.files) {
            if (Array.isArray(req.files)) {
                files = req.files;
            }
            else if (typeof req.files === 'object' && 'documents' in req.files && Array.isArray(req.files.documents)) {
                files = req.files.documents;
            }
        }
        else if (req.file) {
            files = [req.file];
        }
        if (files.length === 0) {
            return res.status(400).json({ error: 'No document files provided' });
        }
        const { organizationName } = req.body;
        if (!organizationName) {
            return res.status(400).json({ error: 'organizationName is required' });
        }
        const documentUrls = [];
        const extractedTexts = [];
        const errors = [];
        // Process all uploaded documents
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Upload document to S3
                const documentUrl = await (0, s3_1.uploadDocumentToS3)(file, organizationName);
                documentUrls.push(documentUrl);
                // Extract text from document
                try {
                    const extractedText = await (0, documentParser_1.extractDocumentText)(file);
                    if (extractedText.trim()) {
                        extractedTexts.push(`--- Document ${i + 1}: ${file.originalname} ---\n${extractedText}`);
                    }
                }
                catch (extractError) {
                    console.error(`[Document Extraction Error] ${file.originalname}:`, extractError);
                    errors.push(`${file.originalname}: ${extractError.message || 'Failed to extract text'}`);
                }
            }
            catch (uploadError) {
                console.error(`[Document Upload Error] ${file.originalname}:`, uploadError);
                errors.push(`${file.originalname}: ${uploadError.message || 'Upload failed'}`);
            }
        }
        // Merge all extracted texts
        const allExtractedText = extractedTexts.join('\n\n');
        if (extractedTexts.length === 0 && errors.length > 0) {
            return res.status(500).json({
                error: 'Failed to extract text from all documents',
                errors
            });
        }
        res.json({
            message: `${files.length} document(s) processed`,
            documentUrls,
            extractedText: allExtractedText,
            extractedTextLength: allExtractedText.length,
            documentsProcessed: extractedTexts.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    }
    catch (err) {
        console.error('[Upload Document For Creation Error]', err);
        res.status(500).json({ error: err.message || 'Failed to upload documents' });
    }
};
exports.uploadDocumentForCreation = uploadDocumentForCreation;
/**
 * GET /api/chatboxes/:id/predefined-questions
 * Get all predefined questions for a chatbox
 */
const getPredefinedQuestions = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { id } = req.params;
        const chatbox = await chatbox_model_1.default.findById(id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const questions = chatbox.predefinedQuestions || [];
        // Sort by order, then by creation order
        const sortedQuestions = questions
            .map((q, index) => ({ ...q.toObject(), originalIndex: index }))
            .sort((a, b) => {
            if (a.order !== b.order)
                return a.order - b.order;
            return a.originalIndex - b.originalIndex;
        })
            .map(({ originalIndex, ...q }) => q);
        res.json({ questions: sortedQuestions });
    }
    catch (err) {
        console.error('[Get Predefined Questions Error]', err);
        res.status(500).json({ error: err.message || 'Failed to fetch predefined questions' });
    }
};
exports.getPredefinedQuestions = getPredefinedQuestions;
/**
 * POST /api/chatboxes/:id/predefined-questions
 * Add a new predefined question
 */
const addPredefinedQuestion = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { id } = req.params;
        const { question, order, isActive } = req.body;
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ error: 'Question text is required' });
        }
        const chatbox = await chatbox_model_1.default.findById(id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Initialize array if it doesn't exist (shouldn't happen with schema default, but safe check)
        if (!chatbox.predefinedQuestions) {
            chatbox.predefinedQuestions = [];
        }
        const currentLength = chatbox.predefinedQuestions?.length || 0;
        const newQuestion = {
            question: question.trim(),
            order: order !== undefined ? Number(order) : currentLength,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        };
        chatbox.predefinedQuestions.push(newQuestion);
        await chatbox.save();
        res.status(201).json({
            message: 'Predefined question added successfully',
            question: newQuestion,
        });
    }
    catch (err) {
        console.error('[Add Predefined Question Error]', err);
        res.status(500).json({ error: err.message || 'Failed to add predefined question' });
    }
};
exports.addPredefinedQuestion = addPredefinedQuestion;
/**
 * PUT /api/chatboxes/:id/predefined-questions/:questionId
 * Update a predefined question
 */
const updatePredefinedQuestion = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { id, questionId } = req.params;
        const { question, order, isActive } = req.body;
        const chatbox = await chatbox_model_1.default.findById(id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!chatbox.predefinedQuestions || chatbox.predefinedQuestions.length === 0) {
            return res.status(404).json({ error: 'Predefined question not found' });
        }
        const questionIndex = chatbox.predefinedQuestions.findIndex((q) => q._id && q._id.toString() === questionId);
        if (questionIndex === -1) {
            return res.status(404).json({ error: 'Predefined question not found' });
        }
        if (question !== undefined) {
            if (typeof question !== 'string' || question.trim().length === 0) {
                return res.status(400).json({ error: 'Question text cannot be empty' });
            }
            chatbox.predefinedQuestions[questionIndex].question = question.trim();
        }
        if (order !== undefined) {
            chatbox.predefinedQuestions[questionIndex].order = Number(order);
        }
        if (isActive !== undefined) {
            chatbox.predefinedQuestions[questionIndex].isActive = Boolean(isActive);
        }
        await chatbox.save();
        res.json({
            message: 'Predefined question updated successfully',
            question: chatbox.predefinedQuestions[questionIndex],
        });
    }
    catch (err) {
        console.error('[Update Predefined Question Error]', err);
        res.status(500).json({ error: err.message || 'Failed to update predefined question' });
    }
};
exports.updatePredefinedQuestion = updatePredefinedQuestion;
/**
 * DELETE /api/chatboxes/:id/predefined-questions/:questionId
 * Delete a predefined question
 */
const deletePredefinedQuestion = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { id, questionId } = req.params;
        const chatbox = await chatbox_model_1.default.findById(id);
        if (!chatbox || chatbox.createdBy.toString() !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!chatbox.predefinedQuestions || chatbox.predefinedQuestions.length === 0) {
            return res.status(404).json({ error: 'Predefined question not found' });
        }
        const questionIndex = chatbox.predefinedQuestions.findIndex((q) => q._id && q._id.toString() === questionId);
        if (questionIndex === -1) {
            return res.status(404).json({ error: 'Predefined question not found' });
        }
        // Use Mongoose's pull method or splice to remove the subdocument
        chatbox.predefinedQuestions.splice(questionIndex, 1);
        await chatbox.save();
        res.json({ message: 'Predefined question deleted successfully' });
    }
    catch (err) {
        console.error('[Delete Predefined Question Error]', err);
        res.status(500).json({ error: err.message || 'Failed to delete predefined question' });
    }
};
exports.deletePredefinedQuestion = deletePredefinedQuestion;
