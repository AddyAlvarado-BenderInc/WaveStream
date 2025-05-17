CREATE TABLE descriptions (
    name TEXT PRIMARY KEY,
    html TEXT NOT NULL,
    css TEXT DEFAULT '',
    js TEXT DEFAULT '',
    combined_html TEXT NOT NULL
);

-- Name is already primary key, which is indexed.
-- You might add full-text search indexes on html, css, js, combined_html if needed.