import RestaurantOrder from '../models/RestaurantOrder.js';
import Financial from '../models/Financial.js';
import RestaurantTable from '../models/RestaurantTable.js';
import Guest from '../models/Guest.js';
import { adjustStock } from './billController.js';

export const createOrder = async (req, res) => {
  try {
    delete req.body._id;
    delete req.body.__v;
    const order = await RestaurantOrder.create(req.body);
    
    // If table is specified, mark it as Occupied
    if (order.tableId) {
      await RestaurantTable.findByIdAndUpdate(order.tableId, { status: 'Occupied' });
    }

    if (req.app.locals.io) {
      const target = order.orderType === 'Table' ? `Table ${order.tableName}` : `${order.guestName || 'Room Guest'}`;
      req.app.locals.io.emit('db-update', { model: 'RestaurantOrder' });
      req.app.locals.io.emit('restaurant-notification', { 
        type: 'CREATED', 
        message: `Order created for ${target}`,
        orderId: order._id 
      });
    }
    res.status(201).json(order);
  } catch (err) {
    console.error('Restaurant Order Create Error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    // Prevent Mongoose immutable/mismatch errors by stripping _id from body
    delete req.body._id;
    delete req.body.__v;

    const oldOrder = await RestaurantOrder.findById(req.params.id);
    if (!oldOrder) return res.status(404).json({ message: 'Order not found' });

    // Handle Table change
    if (req.body.tableId && req.body.tableId !== oldOrder.tableId?.toString()) {
      // Free old table
      if (oldOrder.tableId) {
        await RestaurantTable.findByIdAndUpdate(oldOrder.tableId, { status: 'Available' });
      }
      // Occupy new table
      await RestaurantTable.findByIdAndUpdate(req.body.tableId, { status: 'Occupied' });
    }

    // Handle Status Change impact on Table
    const activeStatuses = ['Pending', 'Preparing', 'Served'];
    const closingStatuses = ['Completed', 'Cancelled'];

    if (req.body.status && req.body.status !== oldOrder.status) {
      if (closingStatuses.includes(req.body.status)) {
        if (oldOrder.tableId) await RestaurantTable.findByIdAndUpdate(oldOrder.tableId, { status: 'Available' });
      } else if (activeStatuses.includes(req.body.status)) {
        if (oldOrder.tableId) await RestaurantTable.findByIdAndUpdate(oldOrder.tableId, { status: 'Occupied' });
      }
    }

    // If status changed to Completed, create a financial record (if not Room Charge or Credit)
    if (req.body.status === 'Completed' && oldOrder.status !== 'Completed') {
      const currentPaymentMethod = req.body.paymentMethod || oldOrder.paymentMethod;
      const isDue = ['Room Charge', 'Credit'].includes(currentPaymentMethod);
      
      if (isDue) {
        // Update Guest Dues
        if (oldOrder.guestId) {
          await Guest.findByIdAndUpdate(oldOrder.guestId, { $inc: { totalDue: oldOrder.totalAmount } });
        } else if (oldOrder.guestName) {
          // Find or create a walk-in guest for credit
          let walkInGuest = await Guest.findOne({ name: oldOrder.guestName, status: 'Credit Guest' });
          if (!walkInGuest) {
            walkInGuest = await Guest.create({
              name: oldOrder.guestName,
              status: 'Credit Guest',
              totalDue: oldOrder.totalAmount
            });
          } else {
            walkInGuest.totalDue += oldOrder.totalAmount;
            await walkInGuest.save();
          }
          // Link order to this guest for future reference
          req.body.guestId = walkInGuest._id;
        }
      } else {
        // Immediate Income
        await Financial.create({
          title: `Restaurant Order - Table ${oldOrder.tableName} (${oldOrder.guestName || 'Normal Person'})`,
          amount: oldOrder.totalAmount,
          type: 'Income',
          date: new Date()
        });
      }

      // Adjust stock regardless of payment method
      const restaurantItems = oldOrder.items.map(item => ({
        itemId: item.itemId,
        item: item.name,
        qty: item.quantity,
        price: item.price,
        total: item.subtotal
      }));
      await adjustStock(restaurantItems, -1);
    }

    const updatedOrder = await RestaurantOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found during update' });
    
    if (req.app.locals.io) {
      req.app.locals.io.emit('db-update', { model: 'RestaurantOrder' });
      
      const target = updatedOrder.orderType === 'Table' ? `Table ${updatedOrder.tableName}` : `${updatedOrder.guestName || 'Room Guest'}`;
      let customMessage = `Order of ${target} updated`;
      
      if (req.body.status && req.body.status !== oldOrder.status) {
        if (req.body.status === 'Preparing') customMessage = `Order of ${target} is sent to kitchen`;
        else if (req.body.status === 'Served') customMessage = `Order is served on ${target}`;
        else if (req.body.status === 'Completed') customMessage = `Order completed for ${target}`;
        else if (req.body.status === 'Cancelled') customMessage = `Order of ${target} was cancelled`;
      }

      req.app.locals.io.emit('restaurant-notification', { 
        type: 'UPDATED', 
        message: customMessage,
        orderId: updatedOrder._id 
      });
    }
    res.json(updatedOrder);
  } catch (err) {
    console.error('Restaurant Order Update Error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await RestaurantOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // If it was completed, reverse impacts (financials, dues, and stock)
    if (order.status === 'Completed') {
      const isDue = ['Room Charge', 'Credit'].includes(order.paymentMethod);

      if (isDue) {
        // Reverse Guest Due
        if (order.guestId) {
          await Guest.findByIdAndUpdate(order.guestId, { $inc: { totalDue: -order.totalAmount } });
        }
      } else {
        // Reverse Financial Income
        await Financial.create({
          title: `REVERSED: Restaurant Order - Table ${order.tableName}`,
          amount: order.totalAmount,
          type: 'Expense',
          date: new Date()
        });
      }

      // Reverse Stock regardless of payment method
      const restaurantItems = order.items.map(item => ({
        itemId: item.itemId,
        item: item.name,
        qty: item.quantity,
        price: item.price,
        total: item.subtotal
      }));
      await adjustStock(restaurantItems, 1);
    }

    // Free the table if it was still occupied by this order
    if (order.tableId && !['Completed', 'Cancelled'].includes(order.status)) {
        await RestaurantTable.findByIdAndUpdate(order.tableId, { status: 'Available' });
    }

    await RestaurantOrder.findByIdAndDelete(req.params.id);
    
    if (req.app.locals.io) {
      const target = order.orderType === 'Table' ? `Table ${order.tableName}` : `${order.guestName || 'Room Guest'}`;
      req.app.locals.io.emit('db-update', { model: 'RestaurantOrder' });
      req.app.locals.io.emit('restaurant-notification', { 
        type: 'DELETED', 
        message: `Order of ${target} was cancelled`,
        orderId: order._id 
      });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Restaurant Order Delete Error:', err);
    res.status(500).json({ message: err.message });
  }
};
