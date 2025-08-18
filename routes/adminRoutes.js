import express from 'express';
import { 
  // User controllers
  getAllUsers, getUserById, updateUser, deleteUser,
  // Membership controllers
  getAllMemberships, getMembershipById, updateMembership, deleteMembership,
  // Profile controllers
  getAllProfiles, getProfileById, updateProfile, deleteProfile,
  // Newsletter controllers
  getAllNewsletterSubscribers, getNewsletterSubscriberById, 
  updateNewsletterSubscriber, deleteNewsletterSubscriber,
  // Notification controllers
  getAllNotifications, getNotificationById, updateNotification, deleteNotification,
  // Stats controllers
  getUsersStats, getMembershipsStats, getNotificationsStats, getNewsletterStats,
  // Announcement controller
  sendAnnouncement
} from '../controller/adminController.js';
import { verifyJWT } from '../middleware/auth.js';
import { isAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Apply authentication and admin verification middleware to all routes
router.use(verifyJWT);
router.use(isAdmin);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

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

// Notification routes
router.get('/notifications', getAllNotifications);
router.get('/notifications/:id', getNotificationById);
router.put('/notifications/:id', updateNotification);
router.delete('/notifications/:id', deleteNotification);

// Announcement route
router.post('/announcements', sendAnnouncement);

// Stats routes
router.get('/stats/users', getUsersStats);
router.get('/stats/memberships', getMembershipsStats);
router.get('/stats/notifications', getNotificationsStats);
router.get('/stats/newsletter', getNewsletterStats);

export default router;