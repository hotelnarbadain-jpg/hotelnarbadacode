# Hotel Narvada Suite v2

Full-stack hotel management starter built with React, Vite, Tailwind CSS, Font Awesome, Node.js, Express, Socket.IO, and MongoDB.

## Included updates in v2
- Responsive admin layout with smaller typography and working mobile logout button
- Live clock updating every second
- Profile dropdown on the header with change-credentials form
- Working CRUD for:
  - Staff
  - Guests
  - Rooms
  - Suppliers
  - Purchase bills
  - Sahakari accounts
  - Financial entries
  - Restaurant menu items
- Inventory portal with Summary / Suppliers / Purchases tabs
- Success notifications styled like the provided design
- Seed data for demo content

## Demo login
- Email: `admin@hotelnarvada.com`
- Password: `admin123`

## Setup
### Backend
```bash
cd backend
npm install
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment files
Pre-filled `.env` files are included for convenience.



Frontend `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

## Notes
- The UI closely follows the screenshots, but some micro-spacing and imagery may still vary slightly.
- File uploads in staff forms are stored as base64 strings for quick local use.
- Socket.IO is wired on the backend and ready for future real-time expansion.
