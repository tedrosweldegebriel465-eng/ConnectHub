/**
 * ============================================
 * AUTH CONTROLLER
 * Version: 2.0.0
 * Description: Handles authentication operations
 *              including register, login, and profile
 * ============================================
 */

const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { validateInviteCode } = require('../utils/inviteCodes');
const { PASSWORD_MIN } = require('../middleware/authValidation');

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate JWT token for user
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Generate refresh token
 * @param {string} id - User ID
 * @returns {string} Refresh token
 */
const generateRefreshToken = (id) => {
  return jwt.sign(
    { id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  bio: user.bio,
  location: user.location,
  website: user.website,
  isVerified: user.isVerified || false,
  role: user.role,
  followers: user.followers?.length || 0,
  following: user.following?.length || 0,
  joinedDate: user.joinedDate,
  lastLogin: user.lastLogin,
});

const MIN_AGE_YEARS = 13;

function isAtLeastMinAge(dateOfBirth) {
  if (!dateOfBirth) return true;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= MIN_AGE_YEARS;
}

// ============================================
// REGISTER
// ============================================

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const {
      name,
      username,
      email,
      password,
      passcode,
      inviteCode,
      ageConfirmed,
      dateOfBirth,
    } = req.body;
    const submittedInviteCode = (inviteCode || passcode || '').trim();

    // Sanitize username by stripping leading @ and non-alphanumeric chars
    let cleanUsername = (username || '').replace(/^@+/, '').trim().toLowerCase();
    cleanUsername = cleanUsername.replace(/[^a-zA-Z0-9_]/g, '');

    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters (letters, numbers, underscores only).'
      });
    }

    const cleanEmail = (email || '').trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    if (existingUser) {
      const field = existingUser.email === cleanEmail ? 'Email' : 'Username';
      return res.status(400).json({
        success: false,
        message: `${field} already in use`
      });
    }

    if (ageConfirmed !== true && ageConfirmed !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'You must confirm you are at least 13 years old to register.',
      });
    }

    if (dateOfBirth && !isAtLeastMinAge(dateOfBirth)) {
      return res.status(400).json({
        success: false,
        message: `You must be at least ${MIN_AGE_YEARS} years old to use this platform.`,
      });
    }

    const inviteResult = validateInviteCode(submittedInviteCode);
    if (!inviteResult.valid) {
      return res.status(403).json({
        success: false,
        message: inviteResult.message,
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      ageConfirmed: true,
      role: inviteResult.isAdmin ? 'admin' : 'user',
      isVerified: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`,
      joinedDate: new Date(),
    });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      refreshToken,
      user: sanitizeUser(user),
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed. Please verify your details.'
    });
  }
};

// ============================================
// LOGIN
// ============================================

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      refreshToken,
      user: sanitizeUser(user),
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET CURRENT USER
// ============================================

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -__v')
      .populate('followers', 'name username avatar')
      .populate('following', 'name username avatar');

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        location: user.location,
        website: user.website,
        isVerified: user.isVerified || false,
        followers: user.followers || [],
        following: user.following || [],
        postsCount: user.posts?.length || 0,
        joinedDate: user.joinedDate,
        lastLogin: user.lastLogin,
        profileViews: user.profileViews || 0,
      }
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// REFRESH TOKEN
// ============================================

/**
 * @desc    Refresh JWT token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// FORGOT PASSWORD
// ============================================

/**
 * @desc    Send password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save({ validateBeforeSave: false });

    // In production, send email with reset link
    // For now, return the token (for testing)
    res.json({
      success: true,
      message: 'Password reset link sent to email',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// RESET PASSWORD
// ============================================

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < PASSWORD_MIN) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${PASSWORD_MIN} characters`
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// LOGOUT
// ============================================

/**
 * @desc    Logout user (invalidate token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// CHECK USERNAME AVAILABILITY
// ============================================

/**
 * @desc    Check if username is available
 * @route   GET /api/auth/check-username
 * @access  Public
 */
const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    
    res.json({
      success: true,
      exists: !!user,
      available: !user,
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking username',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// VERIFY EMAIL
// ============================================

/**
 * @desc    Verify user email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
  checkUsername,
  verifyEmail,
  generateToken,
  generateRefreshToken,
};