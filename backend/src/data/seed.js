import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

import { connectDB } from '../config/db.js';

import User from '../models/User.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Inventory from '../models/Inventory.js';
import RestaurantItem from '../models/RestaurantItem.js';
import Sahakari from '../models/Sahakari.js';
import Profile from '../models/Profile.js';
import Financial from '../models/Financial.js';

// ✅ Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load .env manually (FIXES your error)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ✅ Debug (optional — remove later)
console.log("MONGO_URI:", process.env.MONGO_URI);

// ✅ Connect DB
await connectDB();

try {
  // 🔐 Hash password once
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 🧹 Clear old data
  await Promise.all([
    User.deleteMany(),
    Guest.deleteMany(),
    Room.deleteMany(),
    Inventory.deleteMany(),
    RestaurantItem.deleteMany(),
    Sahakari.deleteMany(),
    Profile.deleteMany(),
    Financial.deleteMany(),
  ]);

  // 👥 USERS (ENUM MATCHED)
  await User.insertMany([
    {
      name: 'Hotel Admin',
      email: 'admin@hotelnarvada.com',
      password: hashedPassword,
      role: 'Admin',
      phone: '9816990185',
    },
    {
      name: 'Reception User',
      email: 'reception@hotelnarvada.com',
      password: hashedPassword,
      role: 'Reception',
    },
    {
      name: 'Waiter User',
      email: 'waiter@hotelnarvada.com',
      password: hashedPassword,
      role: 'Waiter',
    },
    {
      name: 'Kitchen User',
      email: 'kitchen@hotelnarvada.com',
      password: hashedPassword,
      role: 'Kitchen',
    },
    {
      name: 'Housekeeping User',
      email: 'housekeeping@hotelnarvada.com',
      password: hashedPassword,
      role: 'Housekeeping',
    },
  ]);

  // 🧍 GUESTS
  await Guest.insertMany([
    {
      name: 'Aarav Sharma',
      phone: '9800000001',
      city: 'Kathmandu',
      roomNo: '101',
      checkInDate: new Date('2026-03-23'),
      status: 'Checked In',
    },
  ]);

  // 🏨 ROOMS
  await Room.insertMany([
    { roomNo: '101', category: 'Deluxe', rate: 2500, status: 'Occupied', floor: 1 },
    { roomNo: '102', category: 'Standard', rate: 1800, status: 'Available', floor: 1 },
    { roomNo: '201', category: 'Suite', rate: 4500, status: 'Available', floor: 2 },
    { roomNo: '202', category: 'Standard', rate: 1800, status: 'Maintenance', floor: 2 },
  ]);

  // 📦 INVENTORY
  await Inventory.insertMany([
    {
      supplier: 'Fresh Mart',
      invoiceNo: 'INV-001',
      amount: 1200,
      date: new Date('2026-03-23'),
      activeSupplier: true,
    },
  ]);

  // 🍽️ RESTAURANT
  await RestaurantItem.insertMany([
    { name: 'Pancake', category: 'Breakfast', price: 250, stock: 50, available: true },
    { name: 'Tea', category: 'Breakfast', price: 60, stock: 100, available: true },
    { name: 'Veg Momo', category: 'Main Course', price: 180, stock: 80, available: true },
    { name: 'Chicken Thali', category: 'Main Course', price: 450, stock: 40, available: true },
  ]);

  // 🏦 SAHAKARI
  await Sahakari.insertMany([
    {
      name: 'Karnali saving credit cooperative',
      type: 'Saving',
      accountNo: '5550431966',
      balance: 1000,
    },
  ]);

  // 🏢 PROFILE
  await Profile.create({
    officialHotelName: 'Hotel Narvada INN',
    physicalAddress: 'KrishnaMandir , Damak',
    primaryContactNo: '9816990185',
    panVatNumber: '5550435100',
    welcomeMessage: 'Thank you for staying with us!',
  });

  // 💰 FINANCIAL
  await Financial.insertMany([
    {
      title: 'Room Booking',
      amount: 0,
      type: 'Income',
      date: new Date('2026-03-26'),
    },
  ]);

  console.log('✅ Seed data inserted successfully');
  process.exit();

} catch (error) {
  console.error('❌ Seeder Error:', error.message);
  process.exit(1);
}