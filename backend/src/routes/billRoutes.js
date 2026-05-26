import express from 'express';
import { protect } from '../middleware/auth.js';
console.log('--- BILL ROUTES LOADED ---');
import Bill from '../models/Bill.js';
import { listDocs, getDoc, createDoc, updateDoc } from '../utils/genericController.js';
import { adjustStock } from '../controllers/billController.js';

const router = express.Router();
router.use(protect);

router.get('/', listDocs(Bill));
router.get('/:id', getDoc(Bill));
router.post('/', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const lastBill = await Bill.findOne({ billNo: new RegExp(`HNI-${year}-`) }).sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastBill) {
      const parts = lastBill.billNo.split('-');
      const lastNum = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const billNo = `HNI-${year}-${nextNum.toString().padStart(3, '0')}`;
    console.log('Creating Bill with body:', JSON.stringify(req.body, null, 2));
    const bill = await Bill.create({ ...req.body, billNo });
    
    // Decrement stock for inventory items
    await adjustStock(req.body.restaurantItems, -1);

    if (req.app.locals.io) req.app.locals.io.emit('db-update', { model: 'Bill' });
    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.put('/:id', async (req, res) => {
  try {
    const oldBill = await Bill.findById(req.params.id);
    if (!oldBill) return res.status(404).json({ message: 'Bill not found' });

    // 1. Revert old stock
    await adjustStock(oldBill.restaurantItems, 1);

    const updatedBill = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // 2. Apply new stock
    await adjustStock(req.body.restaurantItems, -1);

    if (req.app.locals.io) req.app.locals.io.emit('db-update');
    res.json(updatedBill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (req.user.role === 'Reception') {
      bill.deletionStatus = 'Requested';
      await bill.save();
      if (req.app.locals.io) req.app.locals.io.emit('db-update');
      return res.json({ message: 'Deletion request sent to admin' });
    }

    // Revert stock before deleting
    await adjustStock(bill.restaurantItems, 1);

    await Bill.findByIdAndDelete(req.params.id);
    if (req.app.locals.io) req.app.locals.io.emit('db-update');
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
