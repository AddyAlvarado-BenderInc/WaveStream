import mongoose, { Schema, Document, Model } from 'mongoose';

export interface DescriptionDocument extends Document {
    name: string;
    html: string;
    css: string;
    js: string;
    combinedHTML: string;
}

const DescriptionSchema = new Schema<DescriptionDocument>({
    name: { type: String, required: true, unique: true },
    html: { type: String, required: true },
    css: { type: String, default: ''},
    js: { type: String, default: ''},
    combinedHTML: { type: String, required: true },
});

const Description: Model<DescriptionDocument> =
    mongoose.models.Description || mongoose.model<DescriptionDocument>('Description', DescriptionSchema);

export default Description;