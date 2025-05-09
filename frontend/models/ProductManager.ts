import mongoose, { Schema, Document, Types } from 'mongoose';

const VariablePackageDataEntrySchema = new Schema({
    dataId: Number,
    value: String
}, { _id: false });

const GlobalVariablePackageSchema = new Schema({
    dataId: { type: Number, required: true },
    name: String,
    dataLength: Number,
    variableData: {
        type: Map,
        of: VariablePackageDataEntrySchema
    }
}, { _id: false });

const TableCellDataSchema = new Schema({
    index: { type: Number, required: true },
    classKey: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    isComposite: { type: Boolean, required: true, default: false },
    isPackage: { type: Boolean, required: true, default: false },
    isDisabled: { type: Boolean, required: true, default: false }
}, { _id: false });

export interface ITableCellData {
    index: number;
    classKey: string;
    value: string | string[]; 
    isComposite: boolean;
    isPackage: boolean;
    isDisabled: boolean;
}

export interface IGlobalVariablePackage {
    dataId: number;
    name?: string;
    dataLength?: number;
    variableData?: Map<string, {
        dataId?: number;
        value: string;
    }>;
}

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
  pdf: string[];
  pdfPreview: string[];
  label: string;
  tableSheet: any[]; 
  tableCellData: ITableCellData[];
  mainKeyString: string[];
  globalVariableClassData: any[];
  globalVariablePackageData: IGlobalVariablePackage[];
}

const ProductManagerSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  productType: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  displayAs: { type: String, default: '' },
  itemName: { type: String, default: '', required: false },
  productId: { type: String, default: '' },
  intentRange: { type: String, default: '' },
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
  },
  pdf: {
    type: [String],
    default: [],
  },
  iconPreview: { type: [String], default: [] },
  pdfPreview: { type: [String], default: [] },
  label: { type: String, default: '' },
  tableSheet: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  tableCellData: {
    type: [TableCellDataSchema],
    default: [],
  },
  globalVariableClassData: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  globalVariablePackageData: {
     type: [GlobalVariablePackageSchema],
     default: []
  },
  mainKeyString: { type: [String], default: [] },
});

export default mongoose.models.ProductManager as mongoose.Model<IProductManager> || mongoose.model<IProductManager>('ProductManager', ProductManagerSchema);