import mongoose from 'mongoose';

export interface IProductManager extends Document {
  _id: string;
  name: string;
  productType: string;
  isActive: boolean;
  createdAt: Date;
  displayAs: string;
  productId: string;
  intentRange: string;
  selectorMode: string;
  itemTemplate: string;
  itemName: string;
  descriptionFooter: string;
  buyNowButtonText: string;
  description: string;
  initialJS: string;
  initialHTML: string;
  initialCSS: string;
  icon: string[];
  iconPreview: string[];
  label: string;
  tableSheet: string[];
}

const ProductManagerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  productType: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  displayAs: { type: String, default: '' },
  itemName: { type: String, default: '', required: false },
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
  icon: { 
    type: [String], 
    default: [],
    validate: {
        validator: (filenames: string[]) => filenames.every(f => f.match(/^[\w.-]+$/)),
        message: 'Invalid filename format'
    }
},
  iconPreview: { type: [String], default: [] },
  label: { type: String, default: '' },
  tableSheet: { type: [String], default: []}
});

export default mongoose.models.ProductManager || mongoose.model<IProductManager>('ProductManager', ProductManagerSchema);