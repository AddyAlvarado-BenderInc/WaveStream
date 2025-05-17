CREATE TABLE counters (
    name TEXT PRIMARY KEY,
    sequence_value INTEGER NOT NULL
);

-- Optional: Index if you query by sequence_value often, though name is PK.
-- CREATE INDEX idx_counters_sequence_value ON counters(sequence_value);