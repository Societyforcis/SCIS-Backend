import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { isAdmin } from '../middleware/adminAuth.js';
import * as paymentController from '../controller/paymentController.js';

const router = express.Router();

// Public routes - Get membership fees
router.get('/fees', paymentController.getAllMembershipFees);
router.get('/fees/:type', paymentController.getMembershipFee);

// Protected routes - Payment verification submission
router.post('/verify', verifyJWT, paymentController.submitPaymentVerification);
router.post('/verify/upgrade', verifyJWT, paymentController.submitUpgradePaymentVerification);
router.get('/verify/membership/:membershipId', verifyJWT, paymentController.getVerificationStatusByMembershipId);

// Admin routes - Payment verification management
router.get('/verify/all', verifyJWT, isAdmin, paymentController.getAllPaymentVerifications);
router.get('/verify/:id', verifyJWT, isAdmin, paymentController.getPaymentVerificationById);
router.post('/verify/:id/approve', verifyJWT, isAdmin, paymentController.approvePaymentVerification);
router.post('/verify/:id/reject', verifyJWT, isAdmin, paymentController.rejectPaymentVerification);

export default router;
