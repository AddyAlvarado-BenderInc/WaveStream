CREATE TABLE product_managers (
    id TEXT PRIMARY KEY, -- Corresponds to Mongoose _id: String
    name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    display_as TEXT DEFAULT '',
    item_name TEXT DEFAULT '',
    product_id_str TEXT DEFAULT '', -- Renamed from productId to avoid confusion
    intent_range TEXT DEFAULT '',
    selector_mode TEXT, -- From IProductManager interface, not in Mongoose schema but included
    item_template TEXT DEFAULT '',
    description_footer TEXT DEFAULT '',
    initial_product_link TEXT DEFAULT '', -- From Mongoose schema
    buy_now_button_text TEXT DEFAULT '',
    description TEXT DEFAULT '',
    initial_js TEXT DEFAULT '',
    initial_html TEXT DEFAULT '',
    initial_css TEXT DEFAULT '',
    icon TEXT[] DEFAULT ARRAY[]::TEXT[],
    icon_preview TEXT[] DEFAULT ARRAY[]::TEXT[],
    pdf TEXT[] DEFAULT ARRAY[]::TEXT[],
    pdf_preview TEXT[] DEFAULT ARRAY[]::TEXT[],
    label TEXT DEFAULT '',
    table_sheet JSONB DEFAULT '[]'::JSONB, -- For Mixed[]
    global_variable_class_data JSONB DEFAULT '[]'::JSONB, -- For Mixed[]
    main_key_string TEXT[] DEFAULT ARRAY[]::TEXT[]
);

CREATE INDEX idx_product_managers_name ON product_managers(name);
CREATE INDEX idx_product_managers_product_type ON product_managers(product_type);
CREATE INDEX idx_product_managers_is_active ON product_managers(is_active);
CREATE INDEX idx_product_managers_created_at ON product_managers(created_at);