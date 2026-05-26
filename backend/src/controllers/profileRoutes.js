import express from 'express';
import Profile from '../models/Profile.js';

const router = express.Router();

// ✅ PUBLIC ROUTE (NO AUTH)
router.get('/public', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

export default router;