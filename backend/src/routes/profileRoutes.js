import express from 'express';
import { getProfile, upsertProfile } from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.get('/public', getProfile);
router.get('/', protect, getProfile);
router.put('/', protect, upsertProfile);
export default router;
