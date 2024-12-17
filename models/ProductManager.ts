import mongoose from 'mongoose';

const ProductManagerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  productType: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  displayAs: { type: String, default: '' },
  productId: { type: String, default: '' },
  intentRange: { type: String, default: '' },
  selectorMode: { type: String, default: 'default' },
  itemTemplate: { type: String, default: '' },
  descriptionFooter: { type: String, default: '' },
  initialProductLink: { type: String, default: '' },
  buyNowButtonText: { type: String, default: '' },
  description: { type: String, default: '', description: 'Viewport for the final rendered result' },
  initialJS: { type: String, default: '' },
  initialHTML: { type: String, default: '' },
  initialCSS: { type: String, default: '' },
  icon: { type: String, default: '' },
  label: { type: String, default: '' },
});

export default mongoose.models.ProductManager || mongoose.model('ProductManager', ProductManagerSchema);