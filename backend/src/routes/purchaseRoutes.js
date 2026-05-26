import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from '../controllers/purchaseController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(listPurchases)
  .post(createPurchase);

router.route('/:id')
  .get(getPurchase)
  .put(updatePurchase)
  .delete(deletePurchase);

export default router;
