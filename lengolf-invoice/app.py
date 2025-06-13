import sqlite3
import os
import re # For cleaning filename
from flask import Flask, render_template, request, redirect, url_for, g, flash, send_from_directory
from datetime import datetime
from weasyprint import HTML, CSS # Import WeasyPrint

app = Flask(__name__)
app.secret_key = os.urandom(24)
DATABASE = 'database.db'
PDF_FOLDER = os.path.join(app.root_path, 'invoices')

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def get_setting(key, default=None):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    result = cursor.fetchone()
    return result['value'] if result else default

def get_all_settings():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT key, value FROM settings")
    return {row['key']: row['value'] for row in cursor.fetchall()}

def init_db():
    db_exists = os.path.exists(DATABASE)
    with app.app_context():
        db = get_db()
        schema_path = os.path.join(app.root_path, 'schema.sql')
        if os.path.exists(schema_path):
             with app.open_resource(schema_path, mode='r') as f:
                db.cursor().executescript(f.read())
             db.commit()
             print("Initialized the database from schema.sql.")
        else:
            print("schema.sql not found. Cannot initialize database structure.")

    if not db_exists:
        add_default_lengolf_address()
        with app.app_context():
            db = get_db()
            cursor = db.cursor()
            cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ('default_wht_rate', '3.00'))
            cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ('bank_name', ''))
            cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ('bank_account_number', ''))
            db.commit()

def add_default_lengolf_address():
     with app.app_context():
        db = get_db()
        try:
            cursor = db.cursor()
            settings_to_add = {
                'lengolf_name': 'LENGOLF CO. LTD.',
                'lengolf_address_line1': '540 Mercury Tower, 4 Floor, Unit 407 Ploenchit Road',
                'lengolf_address_line2': 'Lumpini, Pathumwan, Bangkok 10330',
                'lengolf_tax_id': '105566207013' # Example Tax ID
            }
            for key, value in settings_to_add.items():
                 cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))
            db.commit()
            print("Default LENGOLF address settings checked/added.")
        except sqlite3.Error as e:
            print(f"Database error adding default address: {e}")
            db.rollback()

@app.cli.command('init-db')
def init_db_command():
    """Clear existing data and create new tables."""
    if os.path.exists(DATABASE):
        print(f"Deleting existing database: {DATABASE}")
        os.remove(DATABASE)
    init_db()
    print('Initialized the database.')

if not os.path.exists(PDF_FOLDER):
    try:
        os.makedirs(PDF_FOLDER)
        print(f"Created PDF directory: {PDF_FOLDER}")
    except OSError as e:
        print(f"Error creating PDF directory {PDF_FOLDER}: {e}")

@app.route('/')
def index():
    return redirect(url_for('create_invoice_form'))

@app.route('/suppliers')
def manage_suppliers():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM suppliers ORDER BY name')
    suppliers = cursor.fetchall()
    return render_template('suppliers.html', suppliers=suppliers, create_invoice_url=url_for('create_invoice_form'))

@app.route('/add_supplier', methods=['POST'])
def add_supplier():
    name = request.form['name']
    address1 = request.form.get('address_line1')
    address2 = request.form.get('address_line2')
    tax_id = request.form.get('tax_id')
    default_desc = request.form.get('default_description')
    default_price_str = request.form.get('default_unit_price')

    default_price = None
    if default_price_str:
        try:
            default_price = float(default_price_str)
        except ValueError:
            flash('Invalid default price format.', 'error')
            return redirect(url_for('manage_suppliers'))

    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            'INSERT INTO suppliers (name, address_line1, address_line2, tax_id, default_description, default_unit_price) VALUES (?, ?, ?, ?, ?, ?)',
            (name, address1, address2, tax_id, default_desc, default_price)
        )
        db.commit()
        flash(f'Supplier "{name}" added successfully.', 'success')
    except sqlite3.IntegrityError as e:
        db.rollback()
        flash(f'Error adding supplier: Could be a duplicate Tax/ID. ({e})', 'error')
    except sqlite3.Error as e:
        db.rollback()
        flash(f'Database error adding supplier: {e}', 'error')

    return redirect(url_for('manage_suppliers'))

@app.route('/create_invoice')
def create_invoice_form():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT id, name, default_description, default_unit_price FROM suppliers ORDER BY name')
    suppliers = cursor.fetchall()

    default_invoice_number = datetime.now().strftime('%Y%m')
    default_date = datetime.now().strftime('%Y-%m-%d')
    default_tax_rate = get_setting('default_wht_rate', '3.00')

    # Get list of generated PDFs
    try:
        generated_files = sorted(
            [f for f in os.listdir(PDF_FOLDER) if f.endswith('.pdf')],
            key=lambda f: os.path.getmtime(os.path.join(PDF_FOLDER, f)),
            reverse=True
        )[:10] # Show latest 10
    except FileNotFoundError:
        generated_files = []

    return render_template(
        'create_invoice.html',
        suppliers=suppliers,
        default_invoice_number=default_invoice_number,
        default_date=default_date,
        default_tax_rate=default_tax_rate,
        generated_files=generated_files # Pass generated files to template
    )

@app.route('/generate_invoice', methods=['POST'])
def generate_invoice():
    # --- 1. Get Data --- 
    db = get_db()
    cursor = db.cursor()

    supplier_id = request.form.get('supplier_id')
    invoice_number = request.form.get('invoice_number')
    invoice_date_str = request.form.get('invoice_date')
    tax_rate_str = request.form.get('tax_rate')

    # Validate required fields
    if not all([supplier_id, invoice_number, invoice_date_str, tax_rate_str]):
        flash("Missing required fields (Supplier, Invoice #, Date, Tax Rate).", "error")
        return redirect(url_for('create_invoice_form'))
    
    try:
        tax_rate = float(tax_rate_str)
        invoice_date = datetime.strptime(invoice_date_str, '%Y-%m-%d').date()
    except ValueError:
        flash("Invalid date or tax rate format.", "error")
        return redirect(url_for('create_invoice_form'))

    # Get Supplier Details
    cursor.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,))
    supplier = cursor.fetchone()
    if not supplier:
        flash("Selected supplier not found.", "error")
        return redirect(url_for('create_invoice_form'))

    # Get LENGOLF Details & Bank Details from Settings
    settings = get_all_settings()
    lengolf_details = {
        'name': settings.get('lengolf_name', 'LENGOLF CO. LTD.'),
        'address_line1': settings.get('lengolf_address_line1', ''),
        'address_line2': settings.get('lengolf_address_line2', ''),
        'tax_id': settings.get('lengolf_tax_id', '')
    }
    bank_details = {
        'bank_name': settings.get('bank_name'),
        'account_number': settings.get('bank_account_number')
    }

    # Get Line Items
    items_data = request.form.to_dict(flat=False)
    line_items = []
    item_keys = sorted([k for k in items_data if k.startswith('items[')], key=lambda x: int(x.split('[')[1].split(']')[0]))
    subtotal = 0.0
    current_item = None
    current_idx = -1

    for key in item_keys:
        match = re.match(r'items\[(\d+)\]\[(description|amount)\]', key)
        if not match:
            continue
        
        idx = int(match.group(1))
        field = match.group(2)
        value = items_data[key][0].strip()

        if idx != current_idx:
            if current_item and current_item.get('description') and current_item.get('amount', 0) > 0:
                line_items.append(current_item)
                subtotal += current_item['amount']
            current_item = {'description': '', 'amount': 0.0}
            current_idx = idx

        if field == 'description':
            current_item['description'] = value
        elif field == 'amount':
            try:
                current_item['amount'] = float(value)
            except ValueError:
                 current_item['amount'] = 0.0 # Treat invalid amount as 0

    # Append the last valid item
    if current_item and current_item.get('description') and current_item.get('amount', 0) > 0:
        line_items.append(current_item)
        subtotal += current_item['amount']
        
    if not line_items:
        flash("Cannot generate invoice with no valid line items.", "error")
        return redirect(url_for('create_invoice_form'))

    # --- 2. Calculate Totals --- 
    tax_amount = round((subtotal * tax_rate) / 100, 2)
    total = round(subtotal - tax_amount, 2)

    # --- 3. Prepare Data for Template --- 
    invoice_data = {
        'invoice_number': invoice_number,
        'invoice_date_formatted': invoice_date.strftime('%d/%m/%Y'), # Format as DD/MM/YYYY
        'items': line_items,
        'subtotal': subtotal,
        'tax_rate': tax_rate,
        'tax_amount': tax_amount,
        'total': total
    }

    # --- 4. Render HTML --- 
    html_out = render_template(
        'invoice_pdf.html',
        invoice_data=invoice_data,
        supplier=supplier,
        lengolf=lengolf_details,
        bank_details=bank_details
    )

    # --- 5. Generate PDF --- 
    # Define filename (Clean supplier name for filename)
    clean_supplier_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', supplier['name']).strip('_')
    clean_invoice_number = re.sub(r'[^a-zA-Z0-9_.-]', '_', invoice_number).strip('_')
    filename = f"LENGOLF_{clean_supplier_name}_Inv_{clean_invoice_number}.pdf"
    filepath = os.path.join(PDF_FOLDER, filename)

    try:
        # Use WeasyPrint to write PDF
        HTML(string=html_out).write_pdf(filepath)
        flash(f'Successfully generated invoice: <a href="{url_for("serve_pdf", filename=filename)}" target="_blank">{filename}</a>', 'success')
        print(f"Generated PDF: {filepath}")
    except Exception as e:
        flash(f"Error generating PDF: {e}", "error")
        print(f"Error writing PDF {filepath}: {e}")
        # Optionally render the HTML to help debug styling issues
        # with open("debug_invoice.html", "w", encoding="utf-8") as f:
        #     f.write(html_out)
        # print("Debug HTML saved to debug_invoice.html")

    # --- 6. Redirect --- 
    return redirect(url_for('create_invoice_form'))

# Route to serve generated PDFs
@app.route('/invoices/<filename>')
def serve_pdf(filename):
    try:
        return send_from_directory(PDF_FOLDER, filename, as_attachment=False) # Display inline
    except FileNotFoundError:
        flash("Invoice file not found.", "error")
        return redirect(url_for('create_invoice_form'))

if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        with app.app_context():
            init_db()
    else:
        with app.app_context():
             add_default_lengolf_address()
             db = get_db()
             cursor = db.cursor()
             cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ('default_wht_rate', '3.00'))
             cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ('bank_name', ''))
             cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ('bank_account_number', ''))
             db.commit()

    app.run(debug=True) 