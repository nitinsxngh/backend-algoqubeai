import { Request, Response } from 'express';
import requestIp from 'request-ip';
import useragent from 'useragent';
import geoip from 'geoip-lite';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import { hashPassword, comparePassword } from '../utils/hash';
import { AuthenticatedRequest } from '../middleware/auth';
import { PLANS, getPlanById, initializeUserTokens } from '../config/plans';

/**
 * Enhanced helper to extract detailed environment info
 */
const getClientMeta = (req: Request) => {
  const ip = requestIp.getClientIp(req) || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const ua = useragent.parse(userAgent);
  
  // Enhanced browser detection
  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera')) {
    browser = 'Opera';
  } else if (ua.family && ua.family !== 'Other') {
    browser = ua.family;
  }
  
  const os = ua.os?.toString() || 'Unknown OS';
  const device = `${browser} on ${os}`;
  
  // Enhanced location detection
  const geo = geoip.lookup(ip);
  const location = geo ? `${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}` : 'Unknown';
  
  return { 
    ip, 
    device, 
    browser, 
    os, 
    location, 
    userAgent, 
    timestamp: new Date() 
  };
};

/**
 * Helper to log security events
 */
const logSecurityEvent = async (userId: string, eventData: any) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        'activity.securityEvents': {
          timestamp: new Date(),
          type: eventData.type,
          ip: eventData.ip,
          location: eventData.location,
          device: eventData.device,
          details: eventData.details,
          severity: eventData.severity || 'Low',
        }
      }
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

/**
 * Helper to update session statistics
 */
const updateSessionStats = async (userId: string | any, sessionDuration: number) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const stats = user.activity?.sessionStats || {
      totalSessions: 0,
      totalSessionTime: 0,
      averageSessionTime: 0,
      longestSession: 0,
    };

    const newTotalSessions = stats.totalSessions + 1;
    const newTotalTime = stats.totalSessionTime + sessionDuration;
    const newAverage = newTotalTime / newTotalSessions;
    const newLongest = Math.max(stats.longestSession, sessionDuration);

    await User.findByIdAndUpdate(userId, {
      $set: {
        'activity.sessionStats': {
          totalSessions: newTotalSessions,
          totalSessionTime: newTotalTime,
          averageSessionTime: newAverage,
          longestSession: newLongest,
          lastActive: new Date(),
        }
      }
    });
  } catch (error) {
    console.error('Failed to update session stats:', error);
  }
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
    const clientMeta = getClientMeta(req);

    // Initialize tokens for free plan
    const tokens = initializeUserTokens('free');
    const freePlan = getPlanById('free');

    const user = await User.create({
      name,
      email,
      phone,
      password: hashed,
      tokens,
      planDetails: {
        name: freePlan?.name || 'Free',
        price: freePlan?.price || 0,
        tokenLimit: freePlan?.tokenLimit || 1000,
        features: freePlan?.features || [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
      },
      activity: {
        lastLogin: {
          ...clientMeta,
          status: 'Success',
        },
        loginHistory: [{
          ...clientMeta,
          status: 'Success',
        }],
        sessionStats: {
          totalSessions: 1,
          totalSessionTime: 0,
          averageSessionTime: 0,
          longestSession: 0,
          lastActive: new Date(),
        },
        securityEvents: [{
          timestamp: new Date(),
          type: 'Login',
          ip: clientMeta.ip,
          location: clientMeta.location,
          device: clientMeta.device,
          details: 'Account created and first login',
          severity: 'Low',
        }],
      },
      // Legacy fields for backward compatibility
      lastLogin: {
        timestamp: clientMeta.timestamp,
        ip: clientMeta.ip,
        device: clientMeta.device,
        location: clientMeta.location,
        status: 'Success',
      },
      loginHistory: [{
        timestamp: clientMeta.timestamp,
        ip: clientMeta.ip,
        device: clientMeta.device,
        location: clientMeta.location,
        status: 'Success',
      }],
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
    const clientMeta = getClientMeta(req);

    if (!isMatch) {
      // Log failed login attempt
      await User.findByIdAndUpdate(user._id, {
        $push: {
          'activity.loginHistory': {
            ...clientMeta,
            status: 'Failed',
          },
          'activity.securityEvents': {
            timestamp: new Date(),
            type: 'Failed Login',
            ip: clientMeta.ip,
            location: clientMeta.location,
            device: clientMeta.device,
            details: 'Invalid password attempt',
            severity: 'Medium',
          }
        },
      });

      // Legacy update
      await User.findByIdAndUpdate(user._id, {
        $push: {
          loginHistory: {
            timestamp: clientMeta.timestamp,
            ip: clientMeta.ip,
            device: clientMeta.device,
            location: clientMeta.location,
            status: 'Failed',
          },
        },
      });

      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Successful login
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set!');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Update activity tracking
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'activity.lastLogin': {
          ...clientMeta,
          status: 'Success',
        },
      },
      $push: {
        'activity.loginHistory': {
          ...clientMeta,
          status: 'Success',
        },
        'activity.securityEvents': {
          timestamp: new Date(),
          type: 'Login',
          ip: clientMeta.ip,
          location: clientMeta.location,
          device: clientMeta.device,
          details: 'Successful login',
          severity: 'Low',
        }
      },
    });

    // Legacy update
    await User.findByIdAndUpdate(user._id, {
      $set: {
        lastLogin: {
          timestamp: clientMeta.timestamp,
          ip: clientMeta.ip,
          device: clientMeta.device,
          location: clientMeta.location,
          status: 'Success',
        },
      },
      $push: {
        loginHistory: {
          timestamp: clientMeta.timestamp,
          ip: clientMeta.ip,
          device: clientMeta.device,
          location: clientMeta.location,
          status: 'Success',
        },
      },
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const responseUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      plan: user.plan,
      role: user.role,
    };

    res.json({ 
      message: 'Login successful', 
      user: responseUser,
      token: token // Also return token in response body for frontend storage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed', details: err });
  }
};

/**
 * @route   GET /api/users/me
 */
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Fetch full user data from database including plan details
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
};

/**
 * @route   POST /api/users/logout
 * @desc    Logout user and track session duration
 */
export const logoutUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Calculate session duration (assuming login timestamp is stored)
    const lastLogin = user.activity?.lastLogin?.timestamp || user.lastLogin?.timestamp;
    let sessionDuration = 0;
    
    if (lastLogin) {
      sessionDuration = Math.floor((Date.now() - new Date(lastLogin).getTime()) / 1000);
    }

    // Update session statistics
    await updateSessionStats(req.user.id, sessionDuration);

    // Log logout event
    const clientMeta = getClientMeta(req);
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        'activity.securityEvents': {
          timestamp: new Date(),
          type: 'Logout',
          ip: clientMeta.ip,
          location: clientMeta.location,
          device: clientMeta.device,
          details: 'User logged out manually',
          severity: 'Low',
        }
      }
    });

    // Update last login record with session duration
    if (user.activity?.loginHistory && user.activity.loginHistory.length > 0) {
      const lastLoginIndex = user.activity.loginHistory.length - 1;
      await User.findByIdAndUpdate(req.user.id, {
        $set: {
          [`activity.loginHistory.${lastLoginIndex}.sessionDuration`]: sessionDuration,
          [`activity.loginHistory.${lastLoginIndex}.logoutReason`]: 'Manual',
        }
      });
    }

    // Clear cookie
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully', sessionDuration });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Logout failed' });
  }
};

/**
 * @route   POST /api/users/logout
 * @desc    Legacy logout function for backward compatibility
 */
export const logoutUserLegacy = (req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

/**
 * @route   GET /api/users/activity
 * @desc    Returns simplified user activity data
 */
export const getUserActivity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Use new activity structure if available, fallback to legacy
    const activityData = user.activity || {} as any;
    const legacyLoginHistory = user.loginHistory || [];
    const legacyLastLogin = user.lastLogin || {} as any;

    const recentLogins = (activityData.loginHistory || [])
      .filter((login: any) => new Date(login.timestamp) > thirtyDaysAgo)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    // Format login history for display
    const formattedLoginHistory = recentLogins.map((login: any) => {
      // Extract browser from device string if browser field is missing
      let browser = login.browser;
      if (!browser || browser === 'Unknown' || browser === 'Unknown Browser') {
        if (login.device) {
          // Try different patterns to extract browser
          if (login.device.includes('Chrome')) {
            browser = 'Chrome';
          } else if (login.device.includes('Firefox')) {
            browser = 'Firefox';
          } else if (login.device.includes('Safari')) {
            browser = 'Safari';
          } else if (login.device.includes('Edge')) {
            browser = 'Edge';
          } else if (login.device.includes('Opera')) {
            browser = 'Opera';
          } else {
            // Fallback: extract first part before " on "
            const deviceParts = login.device.split(' on ');
            browser = deviceParts[0] || 'Unknown';
          }
        }
      }
      
      return {
        timestamp: login.timestamp,
        ip: login.ip,
        location: login.location,
        device: login.device,
        browser: browser || 'Unknown',
        status: login.status,
      };
    });

    // Use new lastLogin if available, fallback to legacy
    const lastLogin = activityData.lastLogin || legacyLastLogin;
    
    // Extract browser from device string if browser field is missing in lastLogin
    if (lastLogin && (!lastLogin.browser || lastLogin.browser === 'Unknown' || lastLogin.browser === 'Unknown Browser') && lastLogin.device) {
      if (lastLogin.device.includes('Chrome')) {
        lastLogin.browser = 'Chrome';
      } else if (lastLogin.device.includes('Firefox')) {
        lastLogin.browser = 'Firefox';
      } else if (lastLogin.device.includes('Safari')) {
        lastLogin.browser = 'Safari';
      } else if (lastLogin.device.includes('Edge')) {
        lastLogin.browser = 'Edge';
      } else if (lastLogin.device.includes('Opera')) {
        lastLogin.browser = 'Opera';
      } else {
        const deviceParts = lastLogin.device.split(' on ');
        lastLogin.browser = deviceParts[0] || 'Unknown';
      }
    }

    return res.status(200).json({
      lastLogin: lastLogin,
      loginHistory: formattedLoginHistory,
    });
  } catch (err) {
    console.error('Error fetching user activity:', err);
    res.status(500).json({ message: 'Failed to fetch activity', error: err });
  }
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile information
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { name, email, phone } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        name, 
        email, 
        phone,
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log profile update event
    const clientMeta = getClientMeta(req);
    await logSecurityEvent(req.user.id, {
      type: 'Profile Update',
      ip: clientMeta.ip,
      location: clientMeta.location,
      device: clientMeta.device,
      details: 'Profile information updated',
      severity: 'Low',
    });

    res.json({ 
      message: 'Profile updated successfully', 
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        plan: updatedUser.plan,
        role: updatedUser.role,
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

/**
 * @route   PUT /api/users/password
 * @desc    Change user password
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    // Get user with password
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      // Log failed password change attempt
      const clientMeta = getClientMeta(req);
      await logSecurityEvent(req.user.id, {
        type: 'Failed Password Change',
        ip: clientMeta.ip,
        location: clientMeta.location,
        device: clientMeta.device,
        details: 'Invalid current password provided',
        severity: 'Medium',
      });

      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await User.findByIdAndUpdate(req.user.id, {
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    // Log successful password change
    const clientMeta = getClientMeta(req);
    await logSecurityEvent(req.user.id, {
      type: 'Password Change',
      ip: clientMeta.ip,
      location: clientMeta.location,
      device: clientMeta.device,
      details: 'Password changed successfully',
      severity: 'Medium',
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

/**
 * @route   PUT /api/users/notifications
 * @desc    Update notification preferences
 */
export const updateNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { emailAlerts, usageReminders, productUpdates } = req.body;

    // Validate input
    if (typeof emailAlerts !== 'boolean' || 
        typeof usageReminders !== 'boolean' || 
        typeof productUpdates !== 'boolean') {
      return res.status(400).json({ message: 'All notification preferences must be boolean values' });
    }

    // Update notification preferences
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        'preferences.notifications': {
          emailAlerts,
          usageReminders,
          productUpdates,
          updatedAt: new Date()
        },
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Notification preferences updated successfully',
      preferences: updatedUser.preferences?.notifications
    });
  } catch (err) {
    console.error('Notification update error:', err);
    res.status(500).json({ message: 'Failed to update notification preferences' });
  }
};

/**
 * @route   GET /api/users/settings
 * @desc    Get user settings and preferences
 */
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      preferences: user.preferences || {
        notifications: {
          emailAlerts: true,
          usageReminders: false,
          productUpdates: false,
        }
      },
      account: {
        plan: user.plan,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.activity?.lastLogin || user.lastLogin,
      }
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ message: 'Failed to get settings' });
  }
};

/**
 * @route   PUT /api/users/deactivate
 * @desc    Deactivate user account
 */
export const deactivateAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to deactivate account' });
    }

    // Get user with password
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      const clientMeta = getClientMeta(req);
      await logSecurityEvent(req.user.id, {
        type: 'Failed Account Deactivation',
        ip: clientMeta.ip,
        location: clientMeta.location,
        device: clientMeta.device,
        details: 'Invalid password provided for account deactivation',
        severity: 'High',
      });

      return res.status(400).json({ message: 'Invalid password' });
    }

    // Deactivate account
    await User.findByIdAndUpdate(req.user.id, {
      isActive: false,
      deactivatedAt: new Date(),
      updatedAt: new Date()
    });

    // Log account deactivation
    const clientMeta = getClientMeta(req);
    await logSecurityEvent(req.user.id, {
      type: 'Account Deactivation',
      ip: clientMeta.ip,
      location: clientMeta.location,
      device: clientMeta.device,
      details: 'Account deactivated by user',
      severity: 'High',
    });

    // Clear authentication cookie
    res.clearCookie('token');

    res.json({ message: 'Account deactivated successfully' });
  } catch (err) {
    console.error('Account deactivation error:', err);
    res.status(500).json({ message: 'Failed to deactivate account' });
  }
};

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account permanently
 */
export const deleteAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { password, confirmation } = req.body;

    if (!password || !confirmation) {
      return res.status(400).json({ message: 'Password and confirmation are required' });
    }

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ message: 'Confirmation must be "DELETE" to proceed' });
    }

    // Get user with password
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      const clientMeta = getClientMeta(req);
      await logSecurityEvent(req.user.id, {
        type: 'Failed Account Deletion',
        ip: clientMeta.ip,
        location: clientMeta.location,
        device: clientMeta.device,
        details: 'Invalid password provided for account deletion',
        severity: 'Critical',
      });

      return res.status(400).json({ message: 'Invalid password' });
    }

    // Log account deletion attempt (before deletion)
    const clientMeta = getClientMeta(req);
    await logSecurityEvent(req.user.id, {
      type: 'Account Deletion',
      ip: clientMeta.ip,
      location: clientMeta.location,
      device: clientMeta.device,
      details: 'Account permanently deleted by user',
      severity: 'Critical',
    });

    // Delete user account
    await User.findByIdAndDelete(req.user.id);

    // Clear authentication cookie
    res.clearCookie('token');

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ message: 'Failed to delete account' });
  }
};

/**
 * @route   GET /api/users/plans
 * @desc    Get available plans
 */
export const getAvailablePlans = async (req: Request, res: Response) => {
  try {
    res.json({ plans: PLANS });
  } catch (err) {
    console.error('Get plans error:', err);
    res.status(500).json({ message: 'Failed to get plans' });
  }
};

/**
 * @route   POST /api/users/select-plan
 * @desc    Select a plan for the user
 */
export const selectPlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    // Get current user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize tokens for the selected plan
    const tokens = initializeUserTokens(planId);

    // Update user plan and tokens
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        plan: planId,
        tokens,
        planDetails: {
          name: plan.name,
          price: plan.price,
          tokenLimit: plan.tokenLimit,
          features: plan.features,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          isActive: true
        },
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    // Log plan selection
    const clientMeta = getClientMeta(req);
    await logSecurityEvent(req.user.id, {
      type: 'Plan Selection',
      ip: clientMeta.ip,
      location: clientMeta.location,
      device: clientMeta.device,
      details: `Selected ${plan.name} plan with ${tokens.allocated} tokens`,
      severity: 'Low',
    });

    res.json({ 
      message: 'Plan selected successfully', 
      user: updatedUser,
      plan: plan
    });
  } catch (err) {
    console.error('Plan selection error:', err);
    res.status(500).json({ message: 'Failed to select plan' });
  }
};

/**
 * @route   GET /api/users/token-usage
 * @desc    Get user's token usage
 */
export const getTokenUsage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('[Token Debug] Getting token usage for user:', req.user.id);

    const user = await User.findById(req.user.id).select('tokens plan planDetails');
    if (!user) {
      console.log('[Token Debug] User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('[Token Debug] User found:', {
      id: user._id,
      tokens: user.tokens,
      plan: user.plan,
      planDetails: user.planDetails
    });

    const tokens = user.tokens || { allocated: 0, used: 0, remaining: 0 };
    const usagePercentage = tokens.allocated > 0 
      ? Math.round((tokens.used / tokens.allocated) * 100) 
      : 0;

    const response = {
      tokens,
      plan: user.plan,
      planDetails: user.planDetails,
      usagePercentage
    };

    console.log('[Token Debug] Sending response:', response);

    res.json(response);
  } catch (err) {
    console.error('Get token usage error:', err);
    res.status(500).json({ message: 'Failed to get token usage' });
  }
};

/**
 * @route   POST /api/users/use-tokens
 * @desc    Deduct tokens from user's account
 */
export const useTokens = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid token amount is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const tokens = user.tokens || { allocated: 0, used: 0, remaining: 0 };
    
    // Check if user has enough tokens
    if (tokens.remaining < amount) {
      return res.status(400).json({ 
        message: 'Insufficient tokens', 
        available: tokens.remaining,
        requested: amount
      });
    }

    // Update token usage
    const updatedTokens = {
      allocated: tokens.allocated,
      used: tokens.used + amount,
      remaining: tokens.remaining - amount
    };

    await User.findByIdAndUpdate(req.user.id, {
      tokens: updatedTokens,
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Tokens used successfully',
      tokens: updatedTokens
    });
  } catch (err) {
    console.error('Use tokens error:', err);
    res.status(500).json({ message: 'Failed to use tokens' });
  }
};

/**
 * @route   POST /api/users/initialize-tokens
 * @desc    Initialize tokens for existing users (admin function)
 */
export const initializeTokens = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize tokens if not already set
    if (!user.tokens || user.tokens.allocated === 0) {
      const tokens = initializeUserTokens(user.plan || 'free');
      const plan = getPlanById(user.plan || 'free');
      
      await User.findByIdAndUpdate(req.user.id, {
        tokens,
        planDetails: {
          name: plan?.name || 'Free',
          price: plan?.price || 0,
          tokenLimit: plan?.tokenLimit || 1000,
          features: plan?.features || [],
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          isActive: true
        },
        updatedAt: new Date()
      });

      res.json({ 
        message: 'Tokens initialized successfully',
        tokens,
        plan: plan?.name || 'Free'
      });
    } else {
      res.json({ 
        message: 'Tokens already initialized',
        tokens: user.tokens,
        plan: user.plan
      });
    }
  } catch (err) {
    console.error('Initialize tokens error:', err);
    res.status(500).json({ message: 'Failed to initialize tokens' });
  }
};

/**
 * @route   POST /api/users/test-token-consumption
 * @desc    Test token consumption (for debugging)
 */
export const testTokenConsumption = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { amount = 1 } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('[Test Token] Before consumption:', user.tokens);

    const tokens = user.tokens || { allocated: 0, used: 0, remaining: 0 };
    
    // Update token usage
    const updatedTokens = {
      allocated: tokens.allocated,
      used: tokens.used + amount,
      remaining: tokens.remaining - amount
    };

    await User.findByIdAndUpdate(req.user.id, {
      tokens: updatedTokens,
      updatedAt: new Date()
    });

    console.log('[Test Token] After consumption:', updatedTokens);

    res.json({ 
      message: 'Test token consumption successful',
      tokens: updatedTokens,
      consumed: amount
    });
  } catch (err) {
    console.error('Test token consumption error:', err);
    res.status(500).json({ message: 'Failed to test token consumption' });
  }
};

/**
 * @route   POST /api/users/test-plan-update
 * @desc    Test endpoint to manually update user plan for testing
 */
export const testPlanUpdate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { planId } = req.body;
    const plan = getPlanById(planId);
    
    if (!plan) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    const tokens = initializeUserTokens(planId);

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        plan: planId,
        tokens,
        planDetails: {
          name: plan.name,
          price: plan.price,
          tokenLimit: plan.tokenLimit,
          features: plan.features,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true
        },
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    console.log('[Test Plan] Updated user plan:', { planId, planName: plan.name });

    res.json({ 
      message: 'Test plan update successful',
      user: updatedUser,
      plan: plan
    });
  } catch (err) {
    console.error('Test plan update error:', err);
    res.status(500).json({ message: 'Failed to update test plan' });
  }
};
