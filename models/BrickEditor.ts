import mongoose from 'mongoose';

const BrickEditorSchema = new mongoose.Schema({
    brickId: { type: String, required: true, unique: true },
    targetValue: { type: mongoose.Schema.Types.Mixed, default: null },
    intentValue: { type: mongoose.Schema.Types.Mixed, default: null },
    specifiedIntentRange: { type: Number, default: 0 },
    intentSelectionValue: { type: String, default: 'default' },
    actionSelectionValue: { type: String, default: 'default' },
}, { timestamps: true });

const BrickEditor = mongoose.models.BrickEditor || mongoose.model('BrickEditor', BrickEditorSchema);

export default BrickEditor;