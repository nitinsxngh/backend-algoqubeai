import { Request, Response } from 'express';
import requestIp from 'request-ip';
import useragent from 'useragent';
import geoip from 'geoip-lite';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import { hashPassword, comparePassword } from '../utils/hash';

/**
 * Helper to extract environment info (IP, location, device)
 */
const getClientMeta = (req: Request) => {
  const ip = requestIp.getClientIp(req) || 'unknown';
  const ua = useragent.parse(req.headers['user-agent'] || '');
  const device = `${ua.family} on ${ua.os?.toString() || 'Unknown OS'}`;
  const geo = geoip.lookup(ip);
  const location = geo ? `${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}` : 'Unknown';
  return { ip, device, location, timestamp: new Date() };
};

/**
 * @route   POST /api/users/register
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await hashPassword(password);
    const { ip, device, location, timestamp } = getClientMeta(req);

    const user = await User.create({
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed', details: err });
  }
};

/**
 * @route   POST /api/users/login
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await comparePassword(password, user.password);
    const { ip, device, location, timestamp } = getClientMeta(req);

    if (!isMatch) {
      await User.findByIdAndUpdate(user._id, {
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

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // ✅ Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed', details: err });
  }
};


export const getCurrentUser = (req: Request, res: Response) => {
    const token = req.cookies.token;
  
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      res.status(200).json({ user: decoded });
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };

export const logoutUser = (req: Request, res: Response): void => {
    res.clearCookie('token', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  
    res.status(200).json({ message: 'Logged out successfully' });
  };