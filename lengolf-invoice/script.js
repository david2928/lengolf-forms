// Store suppliers
let suppliers = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default invoice date to today
    const today = new Date();
    document.getElementById('invoiceDate').valueAsDate = today;
    
    // Generate default invoice number (YYYYM format)
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 0-based
    document.getElementById('invoiceNumber').value = `${year}${month}`;
    
    // Set up event listeners for calculations
    setupCalculationListeners();
});

// Load suppliers from CSV file
function loadSuppliersFromCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a CSV file');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const content = e.target.result;
        const lines = content.split('\n');
        
        // Clear suppliers array
        suppliers = [];
        
        // Process each line except header (if present)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) continue; // Skip empty lines
            
            // Parse CSV line (handle potential quotes and commas in fields)
            const parts = parseCSVLine(line);
            
            if (parts.length >= 3) {
                const supplier = {
                    name: parts[0],
                    id: parts[1],
                    address: parts[2],
                    bank: parts[3] || '',
                    account: parts[4] || ''
                };
                
                suppliers.push(supplier);
            }
        }
        
        // Load suppliers to dropdown
        loadSuppliers();
        
        alert(`Successfully loaded ${suppliers.length} supplier(s) from CSV.`);
    };
    
    reader.onerror = function() {
        alert('Error reading the CSV file');
    };
    
    reader.readAsText(file);
}

// Parse a single CSV line handling potential quotes and commas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Don't forget to add the last field
    result.push(current.trim());
    
    return result;
}

// Load suppliers into dropdown
function loadSuppliers() {
    const select = document.getElementById('supplierSelect');
    
    // Clear existing options except the first
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add suppliers to the dropdown
    suppliers.forEach((supplier, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = supplier.name;
        select.appendChild(option);
    });
}

// Load supplier details when selected
function loadSupplierDetails() {
    const select = document.getElementById('supplierSelect');
    const selectedValue = select.value;
    
    if (selectedValue !== '') {
        // Load supplier details
        const supplier = suppliers[selectedValue];
        document.getElementById('supplierName').value = supplier.name;
        document.getElementById('supplierId').value = supplier.id;
        document.getElementById('supplierAddress').value = supplier.address;
        document.getElementById('supplierBank').value = supplier.bank || '';
        document.getElementById('supplierAccount').value = supplier.account || '';
    } else {
        // Clear fields
        document.getElementById('supplierName').value = '';
        document.getElementById('supplierId').value = '';
        document.getElementById('supplierAddress').value = '';
        document.getElementById('supplierBank').value = '';
        document.getElementById('supplierAccount').value = '';
    }
}

// Setup calculation event listeners
function setupCalculationListeners() {
    // Listen for changes to quantity and price inputs
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-price')) {
            updateItemAmount(e.target);
            updateTotals();
        }
        
        if (e.target.id === 'taxRate') {
            updateTotals();
        }
    });
}

// Update item amount based on quantity and price
function updateItemAmount(input) {
    const row = input.closest('tr');
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const amount = qty * price;
    
    row.querySelector('.item-amount').textContent = amount.toFixed(2);
}

// Update subtotal, tax, and total
function updateTotals() {
    let subtotal = 0;
    
    // Calculate subtotal
    document.querySelectorAll('.item-amount').forEach(function(element) {
        subtotal += parseFloat(element.textContent) || 0;
    });
    
    // Get tax rate
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    
    // Calculate tax amount
    const taxAmount = subtotal * (taxRate / 100);
    
    // Calculate total (subtotal - tax because it's WHT)
    const total = subtotal - taxAmount;
    
    // Update display
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('taxAmount').textContent = taxAmount.toFixed(2);
    document.getElementById('total').textContent = total.toFixed(2);
}

// Add a new item row
function addItem() {
    const tbody = document.querySelector('#invoiceItems tbody');
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td><input type="text" class="item-description" placeholder="Description"></td>
        <td><input type="number" class="item-qty" value="1" min="1"></td>
        <td><input type="number" class="item-price" value="0" step="0.01"></td>
        <td><span class="item-amount">0.00</span></td>
        <td><button type="button" class="remove-item" onclick="removeItem(this)">Remove</button></td>
    `;
    
    tbody.appendChild(newRow);
    updateTotals();
}

// Remove an item row
function removeItem(button) {
    const row = button.closest('tr');
    
    // Make sure there's at least one row
    if (document.querySelectorAll('#invoiceItems tbody tr').length > 1) {
        row.remove();
        updateTotals();
    } else {
        alert('You must have at least one item in the invoice');
    }
}

// Generate PDF
function generatePDF() {
    // Validate required fields
    if (!validateForm()) {
        return;
    }
    
    // Populate preview
    populatePreview();
    
    // Show preview
    document.getElementById('pdfPreview').style.display = 'block';
    
    // Generate filename
    const supplierName = document.getElementById('supplierName').value.trim();
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    const filename = `LENGOLF_${supplierName.replace(/\s+/g, '_')}_${invoiceNumber}.pdf`;
    
    // Configure html2pdf options
    const element = document.querySelector('.invoice-container');
    
    try {
        // Use a timeout to ensure the preview is fully rendered
        setTimeout(() => {
            // Try with simple options first
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    logging: true,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait',
                }
            };
            
            html2pdf()
                .from(element)
                .set(opt)
                .save()
                .then(() => {
                    // Hide preview after PDF generation
                    document.getElementById('pdfPreview').style.display = 'none';
                })
                .catch(error => {
                    console.error('PDF generation error:', error);
                    
                    // Try alternative approach if primary method fails
                    fallbackPDFGeneration(element, filename);
                });
        }, 500);
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF. Trying alternative method...');
        
        // Try alternative approach if primary method fails
        fallbackPDFGeneration(element, filename);
    }
}

// Fallback PDF generation method
function fallbackPDFGeneration(element, filename) {
    try {
        const opt = {
            margin: 10,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 1.5,
                useCORS: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            }
        };
        
        // Simplified approach
        html2pdf().from(element).save().then(() => {
            // Hide preview after PDF generation
            document.getElementById('pdfPreview').style.display = 'none';
        });
    } catch (error) {
        console.error('Fallback PDF generation error:', error);
        alert('PDF generation failed. Please try again later or use browser print option (Ctrl+P).');
        document.getElementById('pdfPreview').style.display = 'none';
    }
}

// Validate form before generating PDF
function validateForm() {
    const supplierName = document.getElementById('supplierName').value.trim();
    const supplierId = document.getElementById('supplierId').value.trim();
    const supplierAddress = document.getElementById('supplierAddress').value.trim();
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    const invoiceDate = document.getElementById('invoiceDate').value;
    
    if (!supplierName) {
        alert('Please enter supplier name');
        return false;
    }
    
    if (!supplierId) {
        alert('Please enter supplier ID');
        return false;
    }
    
    if (!supplierAddress) {
        alert('Please enter supplier address');
        return false;
    }
    
    if (!invoiceNumber) {
        alert('Please enter invoice number');
        return false;
    }
    
    if (!invoiceDate) {
        alert('Please select invoice date');
        return false;
    }
    
    // Check if at least one item has a description and price
    let hasValidItem = false;
    document.querySelectorAll('#invoiceItems tbody tr').forEach(function(row) {
        const description = row.querySelector('.item-description').value.trim();
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        if (description && price > 0) {
            hasValidItem = true;
        }
    });
    
    if (!hasValidItem) {
        alert('Please add at least one item with description and price');
        return false;
    }
    
    return true;
}

// Populate preview with form data
function populatePreview() {
    // Supplier info
    document.getElementById('preview-supplierName').textContent = document.getElementById('supplierName').value;
    document.getElementById('preview-supplierId').textContent = document.getElementById('supplierId').value;
    document.getElementById('preview-supplierAddress').textContent = document.getElementById('supplierAddress').value.replace(/\n/g, ', ');
    
    // Invoice meta
    document.getElementById('preview-invoiceNumber').textContent = document.getElementById('invoiceNumber').value;
    
    // Format date as DD/MM/YYYY
    const invoiceDate = new Date(document.getElementById('invoiceDate').value);
    const day = invoiceDate.getDate().toString().padStart(2, '0');
    const month = (invoiceDate.getMonth() + 1).toString().padStart(2, '0');
    const year = invoiceDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    document.getElementById('preview-invoiceDate').textContent = formattedDate;
    
    // Bank details
    const supplierBank = document.getElementById('supplierBank').value.trim();
    const supplierAccount = document.getElementById('supplierAccount').value.trim();
    
    if (supplierBank || supplierAccount) {
        document.getElementById('bank-details-section').style.display = 'block';
        document.getElementById('preview-bank').textContent = supplierBank;
        document.getElementById('preview-account').textContent = supplierAccount;
    } else {
        document.getElementById('bank-details-section').style.display = 'none';
    }
    
    // Clear existing items
    document.getElementById('preview-items').innerHTML = '';
    
    // Add items
    document.querySelectorAll('#invoiceItems tbody tr').forEach(function(row) {
        const description = row.querySelector('.item-description').value.trim();
        const qty = row.querySelector('.item-qty').value;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const amount = parseFloat(row.querySelector('.item-amount').textContent) || 0;
        
        if (description) {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td style="padding: 8px; border: 1px solid #ddd;">${description}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center">${qty}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right">${price.toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right">${amount.toFixed(2)}</td>
            `;
            document.getElementById('preview-items').appendChild(newRow);
        }
    });
    
    // Add empty rows for consistent height
    const itemCount = document.querySelectorAll('#preview-items tr').length;
    if (itemCount < 5) {
        for (let i = 0; i < 5 - itemCount; i++) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = `
                <td style="padding: 8px; border: 1px solid #ddd;"></td>
                <td style="padding: 8px; border: 1px solid #ddd;"></td>
                <td style="padding: 8px; border: 1px solid #ddd;"></td>
                <td style="padding: 8px; border: 1px solid #ddd;"></td>
            `;
            document.getElementById('preview-items').appendChild(emptyRow);
        }
    }
    
    // Set totals
    const subtotal = parseFloat(document.getElementById('subtotal').textContent) || 0;
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const taxAmount = parseFloat(document.getElementById('taxAmount').textContent) || 0;
    const total = parseFloat(document.getElementById('total').textContent) || 0;
    
    document.getElementById('preview-subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('preview-taxRate').textContent = taxRate.toFixed(2) + '%';
    document.getElementById('preview-taxAmount').textContent = taxAmount.toFixed(2);
    document.getElementById('preview-total').textContent = total.toFixed(2);
} 