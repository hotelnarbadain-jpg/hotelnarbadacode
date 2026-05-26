export const listDocs = (Model, populate = '') => async (req, res) => {
  const docs = await Model.find().sort({ createdAt: -1 }).populate(populate);
  res.json(docs);
};

export const getDoc = (Model, populate = '') => async (req, res) => {
  const doc = await Model.findById(req.params.id).populate(populate);
  if (!doc) return res.status(404).json({ message: 'Record not found' });
  res.json(doc);
};

export const createDoc = (Model) => async (req, res) => {
  const doc = await Model.create(req.body);
  if (req.app.locals.io) req.app.locals.io.emit('db-update', { model: Model.modelName });
  res.status(201).json(doc);
};

export const updateDoc = (Model) => async (req, res) => {
  const doc = await Model.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Record not found' });

  Object.entries(req.body).forEach(([key, value]) => {
    if (value !== undefined) doc[key] = value;
  });

  await doc.save();
  if (req.app.locals.io) req.app.locals.io.emit('db-update', { model: Model.modelName });
  res.json(doc);
};

export const deleteDoc = (Model) => async (req, res) => {
  const doc = await Model.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Record not found' });
  if (req.app.locals.io) req.app.locals.io.emit('db-update', { model: Model.modelName });
  res.json({ message: 'Deleted successfully' });
};
