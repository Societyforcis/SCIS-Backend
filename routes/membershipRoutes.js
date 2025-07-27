import express from 'express';
import { verifyJWT, optionalJWT } from '../middleware/auth.js';
import * as membershipController from '../controller/membershipController.js';

const router = express.Router();

// Debug route for testing
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Membership API is working' });
});

// Public routes - no authentication required
router.get('/id/:id', membershipController.getMembershipById); // Remove verifyJWT
router.get('/id/:id/validate', membershipController.validateMembership); // Public validation

// Public routes - but with optional JWT to link user if authenticated
router.post('/', optionalJWT, membershipController.registerMembership);

// Protected routes - require authentication
router.get('/current', verifyJWT, membershipController.getCurrentMembership);
router.get('/email/:email', verifyJWT, membershipController.getMembershipByEmail);
router.post('/upgrade', verifyJWT, membershipController.upgradeMembership);

// Add this diagnostic route
router.get('/auth-check', optionalJWT, (req, res) => {
  res.json({
    success: true,
    hasUser: !!req.user,
    user: req.user ? {
      _id: req.user._id,
      id: req.user.id,
      email: req.user.email,
      isAdmin: req.user.isAdmin
    } : null,
    message: req.user ? 'User authenticated' : 'No user in request'
  });
});

export default router;