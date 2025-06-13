DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS settings;

CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  tax_id TEXT UNIQUE, -- Service worker's Tax/ID number
  default_description TEXT,
  default_unit_price REAL
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Add default WHT rate
INSERT INTO settings (key, value) VALUES ('default_wht_rate', '3.00'); 