import express from 'express';
import { 
  getAllMemberships, getMembershipById, updateMembership, deleteMembership,
  getAllProfiles, getProfileById, updateProfile, deleteProfile,
  getUsersStats, getMembershipsStats, getNotificationsStats, getNewsletterStats,
  getAllNewsletterSubscribers, getNewsletterSubscriberById, 
  updateNewsletterSubscriber, deleteNewsletterSubscriber,
  getAllUsers, deleteUser,
  sendAnnouncement
} from '../controller/adminController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication and admin verification middleware to all routes
router.use(verifyJWT);

// User management routes
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

// Announcement route
router.post('/announcements', sendAnnouncement);

// Membership routes
router.get('/memberships', getAllMemberships);
router.get('/memberships/:id', getMembershipById);
router.put('/memberships/:id', updateMembership);
router.delete('/memberships/:id', deleteMembership);

// Profile routes
router.get('/profiles', getAllProfiles);
router.get('/profiles/:id', getProfileById);
router.put('/profiles/:id', updateProfile);
router.delete('/profiles/:id', deleteProfile);

// Newsletter subscriber routes
router.get('/newsletter', getAllNewsletterSubscribers);
router.get('/newsletter/:id', getNewsletterSubscriberById);
router.put('/newsletter/:id', updateNewsletterSubscriber);
router.delete('/newsletter/:id', deleteNewsletterSubscriber);

// Stats routes
router.get('/stats/users', getUsersStats);
router.get('/stats/memberships', getMembershipsStats);
router.get('/stats/notifications', getNotificationsStats);
router.get('/stats/newsletter', getNewsletterStats);

export default router;