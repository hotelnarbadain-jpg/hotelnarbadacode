import express from 'express';
import { protect } from '../middleware/auth.js';
import ShiftSession from '../models/ShiftSession.js';
import Bill from '../models/Bill.js';

const router = express.Router();

router.use(protect);

// Helper: calculate expected cash/fonepay during a shift
async function getExpectedBalances(openedAt, closedAt = new Date()) {
  const bills = await Bill.find({
    createdAt: { $gte: openedAt, $lte: closedAt },
    deletionStatus: 'none'
  });

  let cashCollected = 0;
  let fonepayCollected = 0;

  bills.forEach(bill => {
    const payment = Number(bill.amountPaid || 0);
    if (bill.paymentMethod === 'Cash') {
      cashCollected += payment;
    } else if (bill.paymentMethod === 'fonepay / QR') {
      fonepayCollected += payment;
    }
  });

  return { cashCollected, fonepayCollected };
}

// 1. Get active session for logged-in user
router.get('/active', async (req, res) => {
  try {
    const activeSession = await ShiftSession.findOne({
      user: req.user._id,
      status: 'Open'
    }).populate('user', 'name email');

    if (!activeSession) return res.json({ active: false });

    const { cashCollected, fonepayCollected } = await getExpectedBalances(activeSession.openedAt);

    res.json({
      active: true,
      session: activeSession,
      calculated: {
        cashCollected,
        fonepayCollected,
        expectedClosingCash: activeSession.openingCash + cashCollected,
        expectedClosingFonepay: activeSession.openingFonepay + fonepayCollected
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Get deletion requests (admin use)
router.get('/deletion-requests', async (req, res) => {
  try {
    const requests = await ShiftSession.find({ deletionStatus: 'Requested' })
      .populate('user', 'name email')
      .sort({ updatedAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Get history (closed sessions, excluding deletion-requested ones for clarity)
router.get('/history', async (req, res) => {
  try {
    const history = await ShiftSession.find({ status: 'Closed' })
      .populate('user', 'name email')
      .sort({ closedAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Open shift
router.post('/open', async (req, res) => {
  try {
    const { openingCash, openingFonepay } = req.body;

    const existing = await ShiftSession.findOne({ user: req.user._id, status: 'Open' });
    if (existing) return res.status(400).json({ message: 'A shift is already open. Please close it first.' });

    const session = await ShiftSession.create({
      user: req.user._id,
      openedAt: new Date(),
      openingCash: Number(openingCash || 0),
      openingFonepay: Number(openingFonepay || 0),
      status: 'Open'
    });

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Close shift
router.post('/close', async (req, res) => {
  try {
    const { closingCash, closingFonepay, remarks } = req.body;

    const activeSession = await ShiftSession.findOne({ user: req.user._id, status: 'Open' });
    if (!activeSession) return res.status(400).json({ message: 'No open shift session found.' });

    const { cashCollected, fonepayCollected } = await getExpectedBalances(activeSession.openedAt);

    activeSession.closedAt = new Date();
    activeSession.closingCash = Number(closingCash || 0);
    activeSession.closingFonepay = Number(closingFonepay || 0);
    activeSession.expectedClosingCash = activeSession.openingCash + cashCollected;
    activeSession.expectedClosingFonepay = activeSession.openingFonepay + fonepayCollected;
    activeSession.status = 'Closed';
    activeSession.remarks = remarks;

    await activeSession.save();
    res.json(activeSession);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Edit a shift session (update remarks, closing amounts)
router.put('/:id', async (req, res) => {
  try {
    const { closingCash, closingFonepay, remarks } = req.body;
    const session = await ShiftSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (closingCash !== undefined) session.closingCash = Number(closingCash);
    if (closingFonepay !== undefined) session.closingFonepay = Number(closingFonepay);
    if (remarks !== undefined) session.remarks = remarks;

    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. Request deletion (reception staff sends request)
router.put('/:id/request-delete', async (req, res) => {
  try {
    const session = await ShiftSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    session.deletionStatus = 'Requested';
    await session.save();
    res.json({ message: 'Deletion request submitted for admin approval' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. Reject deletion request (admin rejects)
router.put('/:id/reject-delete', async (req, res) => {
  try {
    const session = await ShiftSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    session.deletionStatus = 'none';
    await session.save();
    res.json({ message: 'Deletion request rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9. Actually delete (admin approves and deletes)
router.delete('/:id', async (req, res) => {
  try {
    const session = await ShiftSession.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Shift session deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
