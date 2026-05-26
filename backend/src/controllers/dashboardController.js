import User from '../models/User.js';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';
import Supplier from '../models/Supplier.js';
import Purchase from '../models/Purchase.js';
import RestaurantItem from '../models/RestaurantItem.js';
import Financial from '../models/Financial.js';
import Salary from '../models/Salary.js';

export const getDashboardStats = async (req, res) => {
  const [staff, occupiedRooms, totalRooms, guests, suppliers, purchases, restaurantItems, financials, salaries] = await Promise.all([
    User.countDocuments(),
    Room.countDocuments({ status: 'Occupied' }),
    Room.countDocuments(),
    Guest.countDocuments({ status: 'Checked In' }),
    Supplier.countDocuments(),
    Purchase.find().populate('supplierId', 'partyName'),
    RestaurantItem.find(),
    Financial.find(),
    Salary.find({ status: 'Paid' }),
  ]);

  const todayRevenue = financials.filter((item) => item.type === 'Income').reduce((sum, item) => sum + item.amount, 0);
  const totalProcurement = purchases.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
  const totalPaidSalaries = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
  const manualExpenses = financials.filter((item) => item.type === 'Expense').reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = manualExpenses + totalProcurement + totalPaidSalaries;

  res.json({
    totalStaff: staff,
    roomsOccupied: occupiedRooms,
    roomsAvailable: totalRooms - occupiedRooms,
    totalRooms,
    totalGuests: guests,
    todayRevenue,
    totalTables: 3,
    activeTables: 1,
    pendingOrders: 0,
    totalProcurement,
    totalPaidSalaries,
    totalExpenses,
    totalInvoices: purchases.length,
    activeSuppliers: suppliers,
    totalOrders: 0,
    restaurantRevenue: todayRevenue,
    menuItems: restaurantItems.length,
  });
};
