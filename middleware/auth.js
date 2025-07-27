import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

export const verifyJWT = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if decoded contains user info - Handle both id and _id for compatibility
    const userId = decoded?._id || decoded?.id;
    if (!userId) {
      console.log('Invalid token structure:', decoded);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token structure' 
      });
    }
    
    // Get user from database
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token: User not found' 
      });
    }
    
    // Set user in request object
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ success: false, message: "Admin access required" });
    }
};

export const requireAdmin = isAdmin; // Alias for compatibility

// Optional JWT verification - doesn't block the request if token is invalid
export const optionalJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Continue without user data
    console.log('No token provided in optionalJWT');
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure consistent user object structure with verifyJWT middleware
    req.user = { 
      _id: decoded.id, // Use _id instead of id for MongoDB consistency
      id: decoded.id,  // Keep id for backward compatibility
      email: decoded.email,
      isAdmin: decoded.isAdmin
    };
    
    console.log('optionalJWT: User authenticated:', {
      _id: req.user._id,
      email: req.user.email
    });
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user data
    console.log('Invalid token in optionalJWT, continuing without user data:', error.message);
    next();
  }
};