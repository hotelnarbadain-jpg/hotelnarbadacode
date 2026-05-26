import express from 'express';
import { protect } from '../middleware/auth.js';
import { createOrder, updateOrder, deleteOrder } from '../controllers/restaurantOrderController.js';
import RestaurantOrder from '../models/RestaurantOrder.js';
import { listDocs, getDoc } from '../utils/genericController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(listDocs(RestaurantOrder))
  .post(createOrder);

router.route('/:id')
  .get(getDoc(RestaurantOrder))
  .put(updateOrder)
  .delete(deleteOrder);

export default router;
