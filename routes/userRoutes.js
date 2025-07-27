import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import * as userController from '../controller/userController.js';
import * as settingsController from '../controller/settingsController.js';
import { profileValidation } from '../middleware/validation.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Public routes
router.post('/login', userController.login);
router.post('/signin', userController.signin);
router.post('/verify-account-otp', userController.verifyAccountOTP);
router.post('/resend-otp', userController.resendOTP); // Added route to resend OTP
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-otp', userController.verifyOTP);
router.post('/reset-password', userController.resetPassword);

// Protected routes
router.get('/verify-token', verifyJWT, userController.verifyToken);
router.get('/profile', verifyJWT, userController.getProfile);
router.put('/profile', verifyJWT, profileValidation, userController.updateProfile);
router.get('/settings', verifyJWT, settingsController.getUserSettings);

// Add Google auth route
router.post('/google/auth', userController.googleLogin);

 // Settings routes
router.put('/settings', verifyJWT, settingsController.updateSettings);

// Notification routes - Use userController instead of notificationController
router.get('/notifications', verifyJWT, userController.getUserNotifications);
router.put('/notifications/:id/read', verifyJWT, userController.markAsRead);
router.delete('/notifications/:id', verifyJWT, userController.deleteNotification);

// Add a route to decode and verify tokens for debugging
router.post('/verify-token', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      success: true,
      decoded
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

export default router;