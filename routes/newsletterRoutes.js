import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { isAdmin } from '../middleware/adminAuth.js';
import * as newsletterController from '../controller/newsletterController.js';

const router = express.Router();

// Public routes
router.post('/subscribe', newsletterController.subscribe);
router.delete('/unsubscribe/:email', newsletterController.unsubscribe);

// Admin routes
router.use(verifyJWT, isAdmin);
router.get('/subscriptions', newsletterController.getAllSubscriptions);
router.delete('/:id', newsletterController.deleteNewsletter);

export default router;