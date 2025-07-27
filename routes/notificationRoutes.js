import express from 'express';
import { verifyJWT, optionalJWT } from '../middleware/auth.js';
import * as notificationController from '../controller/notificationController.js';

const router = express.Router();

// User routes (protected)
router.get('/user', verifyJWT, notificationController.getUserNotifications);
router.get('/unread-count', verifyJWT, notificationController.getUnreadCount);
router.patch('/:id/read', verifyJWT, notificationController.markAsRead);
router.patch('/mark-all-read', verifyJWT, notificationController.markAllAsRead);

// Admin routes (protected)
router.post('/', verifyJWT, notificationController.createNotification);
router.get('/all', verifyJWT, notificationController.getAllNotifications);
router.get('/stats', verifyJWT, notificationController.getNotificationStats);
router.delete('/:id', verifyJWT, notificationController.deleteNotification);

export default router;
