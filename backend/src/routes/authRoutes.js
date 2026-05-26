import express from 'express';
import { loginUser, me, updateCredentials } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.post('/login', loginUser);
router.get('/me', protect, me);
router.put('/credentials', protect, updateCredentials);

export default router;
