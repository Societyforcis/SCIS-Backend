import express from 'express';
import {
  submitBookingMembership,
  getAllBookingMemberships,
  getBookingById,
  getUserBookingStatus,
  approveBooking,
  rejectBooking,
  getBookingStats
} from '../controller/bookingController.js';
import { verifyJWT, optionalJWT } from '../middleware/auth.js';
import { isAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// User routes
router.post('/submit', verifyJWT, submitBookingMembership);
router.get('/status', verifyJWT, getUserBookingStatus);
router.get('/status/:email', optionalJWT, getUserBookingStatus);

// Admin routes
router.get('/all', verifyJWT, isAdmin, getAllBookingMemberships);
router.get('/stats', verifyJWT, isAdmin, getBookingStats);
router.get('/:id', verifyJWT, isAdmin, getBookingById);
router.post('/:id/approve', verifyJWT, isAdmin, approveBooking);
router.post('/:id/reject', verifyJWT, isAdmin, rejectBooking);

export default router;
