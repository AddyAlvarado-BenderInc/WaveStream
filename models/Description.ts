import mongoose, { Schema, Document, Model } from 'mongoose';

export interface DescriptionDocument extends Document {
    id: string;
    deleteId: string;
    name: string;
    html: string;
    css: string;
    js: string;
    combinedHTML: string;
}

const DescriptionSchema = new Schema<DescriptionDocument>({
    id: { type: String, required: true},
    deleteId: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    html: { type: String, required: true },
    css: { type: String, required: true },
    js: { type: String, required: true },
    combinedHTML: { type: String, required: true },
});

const Description: Model<DescriptionDocument> =
    mongoose.models.Description || mongoose.model<DescriptionDocument>('Description', DescriptionSchema);

export default Description;