import Purchase from '../models/Purchase.js';
import InventoryItem from '../models/InventoryItem.js';

export const listPurchases = async (req, res) => {
  const purchases = await Purchase.find().sort({ createdAt: -1 }).populate('supplierId');
  res.json(purchases);
};

export const getPurchase = async (req, res) => {
  const purchase = await Purchase.findById(req.params.id).populate('supplierId');
  if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
  res.json(purchase);
};

export const createPurchase = async (req, res) => {
  const purchase = await Purchase.create(req.body);
  
  // Update stock
  for (const item of purchase.items) {
    if (item.itemId) {
      await InventoryItem.findByIdAndUpdate(item.itemId, { $inc: { stock: item.qty } });
    }
  }

  if (req.app.locals.io) req.app.locals.io.emit('db-update', { model: 'Purchase' });
  res.status(201).json(purchase);
};

export const updatePurchase = async (req, res) => {
  const oldPurchase = await Purchase.findById(req.params.id);
  if (!oldPurchase) return res.status(404).json({ message: 'Purchase not found' });

  // Revert old stock
  for (const item of oldPurchase.items) {
    if (item.itemId) {
      await InventoryItem.findByIdAndUpdate(item.itemId, { $inc: { stock: -item.qty } });
    }
  }

  const purchase = await Purchase.findByIdAndUpdate(req.params.id, req.body, { new: true });
  
  // Apply new stock
  for (const item of purchase.items) {
    if (item.itemId) {
      await InventoryItem.findByIdAndUpdate(item.itemId, { $inc: { stock: item.qty } });
    }
  }

  if (req.app.locals.io) req.app.locals.io.emit('db-update', { model: 'Purchase' });
  res.json(purchase);
};

export const deletePurchase = async (req, res) => {
  const purchase = await Purchase.findByIdAndDelete(req.params.id);
  if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

  // Revert stock
  for (const item of purchase.items) {
    if (item.itemId) {
      await InventoryItem.findByIdAndUpdate(item.itemId, { $inc: { stock: -item.qty } });
    }
  }

  if (req.app.locals.io) req.app.locals.io.emit('db-update', { model: 'Purchase' });
  res.json({ message: 'Purchase deleted' });
};
