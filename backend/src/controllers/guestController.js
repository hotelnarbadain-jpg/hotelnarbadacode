import { listDocs, getDoc, createDoc, updateDoc } from '../utils/genericController.js';
import Guest from '../models/Guest.js';

export const listGuests = listDocs(Guest);
export const getGuest = getDoc(Guest);
export const createGuest = createDoc(Guest);
export const updateGuest = updateDoc(Guest);

export const deleteGuest = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    // 1. Block if dues exist
    if ((guest.totalDue || 0) > 0) {
      return res.status(400).json({ 
        message: `The due of ${guest.name} has not been cleared yet, please clear the due and try again.` 
      });
    }

    if (guest.status === 'Checked In') {
      return res.status(400).json({ 
        message: 'Cannot delete a guest with an active booking. Please check them out first.' 
      });
    }

    // 2. Logic for Reception vs Admin
    // Note: req.user.role is populated by the protect middleware via User model
    if (req.user.role === 'Reception') {
      guest.deletionStatus = 'Requested';
      await guest.save();
      
      if (req.app.locals.io) {
        req.app.locals.io.emit('db-update', { model: 'Guest' });
      }
      
      return res.json({ message: 'Action has been sent to the admin' });
    }

    // Admin deletes immediately
    await Guest.findByIdAndDelete(req.params.id);
    
    if (req.app.locals.io) {
      req.app.locals.io.emit('db-update', { model: 'Guest' });
    }

    res.json({ message: 'Guest deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listDeletionRequests = async (req, res) => {
  try {
    const requests = await Guest.find({ deletionStatus: 'Requested' });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const rejectDeletion = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    
    guest.deletionStatus = 'none';
    await guest.save();
    
    if (req.app.locals.io) {
      req.app.locals.io.emit('db-update', { model: 'Guest' });
    }
    
    res.json({ message: 'Deletion request rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
