import express from 'express';
import { verifyJWT, optionalJWT } from '../middleware/auth.js';
import * as membershipController from '../controller/membershipController.js';

const router = express.Router();

// Debug route for testing
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Membership API is working' });
});

// Get valid membership types and fees (public)
router.get('/types', (req, res) => {
  res.json({
    success: true,
    membershipTypes: [
      { 
        value: 'student-ug', 
        label: 'Student Membership (UG)', 
        description: 'For Undergraduate Students',
        fee: 250,
        duration: '1 Year',
        benefits: [
          'Access to research papers',
          'Student networking events',
          'Basic cybersecurity resources',
          'Monthly newsletter'
        ]
      },
      { 
        value: 'student-pg', 
        label: 'Student Membership (PG)', 
        description: 'For Postgraduate/Masters Students',
        fee: 350,
        duration: '1 Year',
        benefits: [
          'All UG benefits',
          'Advanced research access',
          'Conference discounts',
          'Mentorship opportunities'
        ]
      },
      { 
        value: 'academic', 
        label: 'Academic Membership', 
        description: 'For Faculty, Researchers & Academics',
        fee: 500,
        duration: '1 Year',
        benefits: [
          'All student benefits',
          'Professional certification',
          'Research collaboration platform',
          'Priority conference registration',
          'Publication opportunities'
        ]
      },
      { 
        value: 'industry', 
        label: 'Industry Membership', 
        description: 'For Industry Professionals',
        fee: 750,
        duration: '1 Year',
        benefits: [
          'All professional benefits',
          'Industry networking events',
          'Advanced research access',
          'Career development resources',
          'Priority support',
          'Custom research reports'
        ]
      },
      { 
        value: 'international', 
        label: 'International Membership', 
        description: 'For Non-Indian Residents (Global)',
        fee: 600,
        duration: '1 Year',
        benefits: [
          'All core benefits',
          'Global networking access',
          'Virtual conference participation',
          'International collaboration platform',
          'Regional support'
        ]
      }
    ],
    note: 'Old values like "student", "professional", "corporate" are automatically converted',
    currency: 'INR'
  });
});

// Public routes - no authentication required
router.get('/id/:id', membershipController.getMembershipById); // Remove verifyJWT
router.get('/id/:id/validate', membershipController.validateMembership); // Public validation
router.get('/approval-status', membershipController.checkApprovalStatus); // Check approval status

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