import mongoose from 'mongoose';

const ProductManagerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  productType: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ProductManager || mongoose.model('ProductManager', ProductManagerSchema);