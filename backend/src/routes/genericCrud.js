import express from 'express';
import { protect } from '../middleware/auth.js';
import { listDocs, getDoc, createDoc, updateDoc, deleteDoc } from '../utils/genericController.js';

const createCrudRouter = (Model, populate = '') => {
  const router = express.Router();
  router.use(protect);
  router.route('/').get(listDocs(Model, populate)).post(createDoc(Model));
  router.route('/:id').get(getDoc(Model, populate)).put(updateDoc(Model)).delete(deleteDoc(Model));
  return router;
};

export default createCrudRouter;
