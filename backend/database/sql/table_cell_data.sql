CREATE TABLE table_cell_data (
    id BIGSERIAL PRIMARY KEY, -- Auto-incrementing primary key for this table
    product_manager_id TEXT NOT NULL REFERENCES product_managers(id) ON DELETE CASCADE,
    index_val INTEGER NOT NULL, -- Renamed from 'index'
    class_key TEXT NOT NULL,
    -- For 'value: string | string[]', TEXT[] can store single strings as one-element arrays
    -- or use JSONB if truly mixed types beyond string/string[] are possible.
    -- Given ITableCellData, TEXT[] seems appropriate.
    value_data TEXT[], -- Storing string or string[]
    is_composite BOOLEAN NOT NULL DEFAULT FALSE,
    is_package BOOLEAN NOT NULL DEFAULT FALSE,
    is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (product_manager_id, class_key, index_val) -- Assuming this combination should be unique per product_manager
);

CREATE INDEX idx_table_cell_data_product_manager_id ON table_cell_data(product_manager_id);
CREATE INDEX idx_table_cell_data_class_key ON table_cell_data(class_key);