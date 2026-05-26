import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import createCrudRouter from './routes/genericCrud.js';
import User from './models/User.js';
import Guest from './models/Guest.js';
import Room from './models/Room.js';
import Inventory from './models/Inventory.js';
import RestaurantItem from './models/RestaurantItem.js';
import Sahakari from './models/Sahakari.js';
import Financial from './models/Financial.js';
import Supplier from './models/Supplier.js';
import Purchase from './models/Purchase.js';
import RoomCategory from './models/RoomCategory.js';
import SahakariDepositType from './models/SahakariDepositType.js';
import Salary from './models/Salary.js';
import guestRoutes from './routes/guestRoutes.js';
import billRoutes from './routes/billRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import restaurantOrderRoutes from './routes/restaurantOrderRoutes.js';
import InventoryItem from './models/InventoryItem.js';
import RestaurantCategory from './models/RestaurantCategory.js';
import RestaurantTable from './models/RestaurantTable.js';
import RestaurantOrder from './models/RestaurantOrder.js';

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true, methods: ["GET", "POST"] },
});

app.locals.io = io;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

io.on('connection', (socket) => {
  socket.emit('connected', { message: 'Socket connected' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Hotel Narvada API running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.get('/api/salary/test', (req, res) => res.json({ message: 'Salary route active' }));
app.use('/api/salary', createCrudRouter(Salary, 'staff'));
app.use('/api/staff', createCrudRouter(User));
app.use('/api/guests', guestRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/rooms', createCrudRouter(Room));
app.use('/api/inventory', createCrudRouter(Inventory));
app.use('/api/inventory-items', createCrudRouter(InventoryItem));
app.use('/api/restaurant-items', createCrudRouter(RestaurantItem));
app.use('/api/restaurant-categories', createCrudRouter(RestaurantCategory));
app.use('/api/restaurant-tables', createCrudRouter(RestaurantTable));
app.use('/api/restaurant-orders', restaurantOrderRoutes);
app.use('/api/sahakari', createCrudRouter(Sahakari));
app.use('/api/financials', createCrudRouter(Financial));
app.use('/api/suppliers', createCrudRouter(Supplier));
app.use('/api/purchases', purchaseRoutes);
app.use('/api/room-categories', createCrudRouter(RoomCategory));
app.use('/api/deposit-types', createCrudRouter(SahakariDepositType));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
