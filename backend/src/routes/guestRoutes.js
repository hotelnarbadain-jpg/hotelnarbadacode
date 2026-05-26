import express from 'express';
import { protect } from '../middleware/auth.js';
import { listGuests, getGuest, createGuest, updateGuest, deleteGuest, listDeletionRequests, rejectDeletion } from '../controllers/guestController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(listGuests)
  .post(createGuest);

router.route('/requests')
  .get(listDeletionRequests);

router.route('/:id')
  .get(getGuest)
  .put(updateGuest)
  .delete(deleteGuest);

router.route('/:id/reject')
  .put(rejectDeletion);

export default router;
