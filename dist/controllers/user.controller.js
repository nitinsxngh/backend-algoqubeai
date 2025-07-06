"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.getCurrentUser = exports.loginUser = exports.registerUser = void 0;
const request_ip_1 = __importDefault(require("request-ip"));
const useragent_1 = __importDefault(require("useragent"));
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
const hash_1 = require("../utils/hash");
/**
 * Helper to extract environment info (IP, location, device)
 */
const getClientMeta = (req) => {
    const ip = request_ip_1.default.getClientIp(req) || 'unknown';
    const ua = useragent_1.default.parse(req.headers['user-agent'] || '');
    const device = `${ua.family} on ${ua.os?.toString() || 'Unknown OS'}`;
    const geo = geoip_lite_1.default.lookup(ip);
    const location = geo ? `${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}` : 'Unknown';
    return { ip, device, location, timestamp: new Date() };
};
/**
 * @route   POST /api/users/register
 */
const registerUser = async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;
        const existing = await user_model_1.default.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashed = await (0, hash_1.hashPassword)(password);
        const { ip, device, location, timestamp } = getClientMeta(req);
        const user = await user_model_1.default.create({
            name,
            email,
            phone,
            password: hashed,
            lastLogin: {
                timestamp,
                ip,
                device,
                location,
                status: 'Success',
            },
            loginHistory: [
                {
                    timestamp,
                    ip,
                    device,
                    location,
                    status: 'Success',
                },
            ],
        });
        const responseUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            plan: user.plan,
            role: user.role,
        };
        res.status(201).json({ message: 'User registered successfully', user: responseUser });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed', details: err });
    }
};
exports.registerUser = registerUser;
/**
 * @route   POST /api/users/login
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user)
            return res.status(400).json({ message: 'Invalid email or password' });
        const isMatch = await (0, hash_1.comparePassword)(password, user.password);
        const { ip, device, location, timestamp } = getClientMeta(req);
        if (!isMatch) {
            await user_model_1.default.findByIdAndUpdate(user._id, {
                $push: {
                    loginHistory: {
                        timestamp,
                        ip,
                        device,
                        location,
                        status: 'Failed',
                    },
                },
            });
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        // Update login info
        user.lastLogin = { timestamp, ip, device, location, status: 'Success' };
        user.loginHistory.push({ timestamp, ip, device, location, status: 'Success' });
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // ✅ Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        // ✅ Also return token in response body so frontend can store it
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                plan: user.plan,
                role: user.role,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed', details: err });
    }
};
exports.loginUser = loginUser;
/**
 * @route   GET /api/users/me
 */
const getCurrentUser = (req, res) => {
    const token = req.cookies.token;
    if (!token)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ user: decoded });
    }
    catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
exports.getCurrentUser = getCurrentUser;
/**
 * @route   POST /api/users/logout
 */
const logoutUser = (req, res) => {
    res.clearCookie('token', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    });
    res.status(200).json({ message: 'Logged out successfully' });
};
exports.logoutUser = logoutUser;
