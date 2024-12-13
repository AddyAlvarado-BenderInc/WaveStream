import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sequenceValue: { type: Number, required: true },
});

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
