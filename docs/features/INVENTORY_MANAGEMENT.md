# Inventory Management System Documentation

## Overview

The Lengolf Forms inventory management system provides comprehensive tracking and management of facility inventory including equipment, consumables, maintenance items, and supplies. The system features daily submissions, automated reporting, stock level monitoring, and integration with LINE messaging for alerts and weekly reports.

## System Architecture

### Database Schema

#### Core Tables

##### inventory_categories
Organizes products into logical groupings for better management and reporting.

```sql
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Fields**:
- `name`: Category name (e.g., "Golf Equipment", "F&B Supplies", "Maintenance")
- `display_order`: Sort order for UI presentation
- `is_active`: Soft delete flag for category management

##### inventory_products
Defines individual products with their properties and management settings.

```sql
CREATE TABLE inventory_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES inventory_categories(id),
    name VARCHAR NOT NULL,
    unit VARCHAR, -- e.g., "pieces", "bottles", "kg"
    input_type VARCHAR NOT NULL, -- "number", "text", "select", "checkbox"
    input_options JSONB, -- Options for select/checkbox inputs
    reorder_threshold NUMERIC, -- Stock level for reorder alerts
    supplier VARCHAR,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Input Types**:
- `number`: Numeric quantity input
- `text`: Free text input for notes/descriptions
- `select`: Dropdown selection from predefined options
- `checkbox`: Multiple selection options

##### inventory_submission
Records daily inventory counts and updates from staff members.

```sql
CREATE TABLE inventory_submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    staff VARCHAR NOT NULL,
    product_id UUID NOT NULL REFERENCES inventory_products(id),
    category_id UUID NOT NULL REFERENCES inventory_categories(id),
    value_numeric NUMERIC, -- For numeric inputs
    value_text TEXT, -- For text inputs
    value_json JSONB, -- For complex inputs (select/checkbox)
    note TEXT, -- Additional notes
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Data Storage Strategy**:
- Different value fields for different input types
- JSON storage for complex select/checkbox values
- Daily aggregation by staff member

## Features and Functionality

### 1. Daily Inventory Submissions

#### Staff Interface
- **Mobile-Optimized Form**: Responsive design for tablet/phone use
- **Category Navigation**: Organized by product categories
- **Input Validation**: Type-specific validation rules
- **Progress Tracking**: Shows completion status
- **Offline Support**: Local storage for unreliable connections

#### Submission Process
1. **Staff Login**: Authenticated staff access
2. **Date Selection**: Current or specific date entry
3. **Category Selection**: Navigate through product categories
4. **Product Entry**: Submit quantities/status for each product
5. **Notes Addition**: Optional notes for special conditions
6. **Submission Confirmation**: Review and submit entire form

### 2. Product Management

#### Product Configuration
- **Category Assignment**: Organize products by category
- **Input Type Definition**: Configure appropriate input method
- **Threshold Setting**: Set reorder points for automated alerts
- **Supplier Information**: Track supplier details
- **Display Ordering**: Custom sort order for forms

#### Product Types Examples

##### Consumables
- **Golf Balls**: Numeric count by brand/type
- **Beverages**: Bottle/can counts with expiration tracking
- **Snacks**: Package counts with variety options
- **Cleaning Supplies**: Volume/quantity tracking

##### Equipment
- **Golf Clubs**: Status checks (working/needs repair)
- **Maintenance Tools**: Availability and condition
- **Electronic Equipment**: Functional status tracking
- **Safety Equipment**: Compliance and expiration checks

### 3. Automated Reporting

#### Daily Reports
Generated automatically from submissions and sent via LINE messaging:

```
📊 Daily Inventory Report - {date}

Staff Submissions: {count}
Categories Updated: {category_count}
Low Stock Alerts: {alert_count}

Low Stock Items:
• {product_name}: {current_stock} (Threshold: {threshold})
• {product_name}: {current_stock} (Threshold: {threshold})

Report generated at: {timestamp}
```

#### Weekly Summary Reports
Comprehensive weekly reports sent every Monday:

```
📈 Weekly Inventory Summary
Week of {start_date} to {end_date}

📋 Submission Statistics:
• Total Submissions: {total_count}
• Daily Average: {average_per_day}
• Staff Participation: {staff_count} members

📦 Stock Status:
• Products Tracked: {product_count}
• Low Stock Alerts: {low_stock_count}
• Reorder Required: {reorder_count}

🏪 Top Categories by Activity:
1. {category_name}: {submission_count} updates
2. {category_name}: {submission_count} updates
3. {category_name}: {submission_count} updates

Generated: {timestamp}
```

### 4. Stock Level Monitoring

#### Reorder Alert System
- **Threshold Monitoring**: Daily checks against reorder points
- **Automated Alerts**: LINE messages for low stock items
- **Supplier Integration**: Include supplier information in alerts
- **Escalation Logic**: Repeated alerts for critical items

#### Stock Analytics
- **Consumption Patterns**: Track usage trends over time
- **Seasonal Analysis**: Identify seasonal demand patterns
- **Staff Performance**: Monitor submission consistency
- **Category Performance**: Analyze category-wise inventory health

## API Endpoints

### Inventory Submission API

#### Get Categories and Products
```
GET /api/inventory/structure
```

Returns organized category and product hierarchy:
```json
{
  "categories": [
    {
      "id": "category-uuid",
      "name": "Golf Equipment",
      "display_order": 1,
      "products": [
        {
          "id": "product-uuid",
          "name": "Golf Balls - Titleist",
          "unit": "dozens",
          "input_type": "number",
          "reorder_threshold": 10,
          "current_stock": 15
        }
      ]
    }
  ]
}
```

#### Submit Daily Inventory
```
POST /api/inventory/submit
```

**Payload**:
```json
{
  "date": "2024-01-15",
  "staff": "John Doe",
  "submissions": [
    {
      "product_id": "product-uuid",
      "value_numeric": 12,
      "note": "Received new shipment"
    },
    {
      "product_id": "product-uuid-2",
      "value_text": "Good condition",
      "note": "All equipment functional"
    }
  ]
}
```

#### Get Submission History
```
GET /api/inventory/submissions?date=2024-01-15&staff=John
```

Returns historical submission data for analysis.

### Reporting API

#### Generate Daily Report
```
POST /api/inventory/reports/daily
```

Triggers generation and sending of daily inventory report.

#### Get Stock Alerts
```
GET /api/inventory/alerts
```

Returns current low stock alerts:
```json
{
  "alerts": [
    {
      "product_id": "product-uuid",
      "product_name": "Golf Balls - Titleist",
      "current_stock": 8,
      "reorder_threshold": 10,
      "supplier": "Pro Shop Supply",
      "days_below_threshold": 3
    }
  ]
}
```

## Business Logic

### Daily Submission Workflow

1. **Form Generation**: Dynamic form based on active products
2. **Data Validation**: Input type and range validation
3. **Duplicate Prevention**: Check for existing daily submissions
4. **Stock Calculation**: Update current stock levels
5. **Alert Evaluation**: Check against reorder thresholds
6. **Notification Dispatch**: Send alerts via LINE messaging

### Stock Level Calculation

#### Current Stock Determination
```typescript
function calculateCurrentStock(productId: string, date: Date): number {
  // Get most recent submission for product
  const latestSubmission = getLatestSubmission(productId, date);
  
  // For numeric products, return the submitted value
  if (latestSubmission.value_numeric !== null) {
    return latestSubmission.value_numeric;
  }
  
  // For text/status products, derive numeric value
  return deriveStockFromStatus(latestSubmission.value_text);
}
```

#### Reorder Alert Logic
```typescript
function checkReorderAlerts(): AlertItem[] {
  const alerts: AlertItem[] = [];
  
  for (const product of getActiveProducts()) {
    const currentStock = calculateCurrentStock(product.id, new Date());
    
    if (currentStock <= product.reorder_threshold) {
      alerts.push({
        product,
        currentStock,
        daysBelow: calculateDaysBelowThreshold(product.id)
      });
    }
  }
  
  return alerts;
}
```

### Reporting Logic

#### Weekly Report Generation
```typescript
async function generateWeeklyReport(startDate: Date, endDate: Date) {
  const stats = {
    totalSubmissions: await countSubmissions(startDate, endDate),
    staffParticipation: await getUniqueStaffCount(startDate, endDate),
    categoryActivity: await getCategoryActivity(startDate, endDate),
    lowStockItems: await getLowStockItems(),
  };
  
  const report = formatWeeklyReport(stats);
  await sendLINEMessage('inventory', report);
}
```

## User Interface

### Mobile Inventory Form

#### Design Principles
- **Touch-Friendly**: Large buttons and input areas
- **Progressive Disclosure**: Show categories first, then products
- **Visual Feedback**: Clear indication of completion status
- **Offline Capability**: Work without constant internet connection

#### Form Flow
1. **Date Selection**: Choose submission date (defaults to today)
2. **Staff Identification**: Select or enter staff member name
3. **Category Navigation**: Expandable category sections
4. **Product Entry**: Category-specific product forms
5. **Review**: Summary of all entries
6. **Submit**: Final submission with confirmation

#### Input Types Implementation

##### Numeric Input
```typescript
<NumberInput
  label={product.name}
  unit={product.unit}
  value={submission.value_numeric}
  onChange={handleNumericChange}
  min={0}
  step={product.unit === 'dozens' ? 1 : 0.1}
/>
```

##### Select Input
```typescript
<SelectInput
  label={product.name}
  options={product.input_options.options}
  value={submission.value_json}
  onChange={handleSelectChange}
  multiple={product.input_options.multiple}
/>
```

##### Text Input
```typescript
<TextInput
  label={product.name}
  value={submission.value_text}
  onChange={handleTextChange}
  placeholder={product.input_options.placeholder}
  maxLength={product.input_options.maxLength}
/>
```

### Admin Dashboard

#### Inventory Overview
- **Stock Status Grid**: Visual representation of all products
- **Alert Summary**: Current low stock alerts
- **Submission Timeline**: Recent staff submissions
- **Category Performance**: Category-wise statistics

#### Product Management Interface
- **Category Management**: Add/edit/reorder categories
- **Product Configuration**: Set up new products and modify existing
- **Threshold Management**: Bulk update reorder thresholds
- **Supplier Management**: Maintain supplier information

#### Reporting Dashboard
- **Report Generation**: On-demand report creation
- **Historical Analysis**: Trend analysis and charts
- **Export Functions**: CSV/Excel export capabilities
- **Alert Configuration**: Customize alert rules and recipients

## Integration Points

### LINE Messaging Integration

#### Daily Alerts
Automatic alerts sent for low stock items:
```typescript
async function sendLowStockAlert(alerts: AlertItem[]) {
  const message = formatLowStockMessage(alerts);
  await sendLINEMessage('inventory-alerts', message);
}
```

#### Weekly Reports
Comprehensive weekly summaries:
```typescript
async function sendWeeklyReport() {
  const report = await generateWeeklyReport();
  await sendLINEMessage('inventory-reports', report);
}
```

### Staff Management Integration

#### Staff Authentication
- **User Profiles**: Link submissions to staff profiles
- **Permission Levels**: Different access levels for different roles
- **Submission History**: Track individual staff submission patterns

#### Performance Tracking
- **Consistency Metrics**: Track regular submission patterns
- **Quality Scores**: Monitor submission accuracy and completeness
- **Training Needs**: Identify staff requiring additional training

## Monitoring and Analytics

### Key Performance Indicators

#### Operational KPIs
- **Submission Completion Rate**: Percentage of expected vs actual submissions
- **Stock-Out Incidents**: Frequency of zero-stock situations
- **Reorder Response Time**: Time from alert to restocking
- **Staff Participation Rate**: Percentage of staff making regular submissions

#### Business KPIs
- **Inventory Turnover**: Rate of inventory consumption
- **Cost Per Unit Tracked**: Efficiency of inventory management
- **Waste Reduction**: Decrease in expired/unused items
- **Supplier Performance**: On-time delivery and quality metrics

### Reporting and Dashboards

#### Real-Time Dashboard
- **Current Stock Levels**: Live view of all product stocks
- **Today's Submissions**: Real-time submission tracking
- **Active Alerts**: Current low stock and critical alerts
- **System Health**: API status and integration health

#### Historical Analytics
- **Trend Analysis**: Stock level trends over time
- **Seasonal Patterns**: Identify seasonal demand variations
- **Category Performance**: Compare performance across categories
- **Staff Performance**: Individual and team performance metrics

## Troubleshooting and Maintenance

### Common Issues

#### Submission Problems
- **Duplicate Submissions**: Prevention and resolution
- **Data Validation Errors**: Common validation failures
- **Mobile App Issues**: Offline sync problems
- **Permission Errors**: Staff access issues

#### Integration Issues
- **LINE Message Failures**: Webhook and API problems
- **Database Connection**: Connection pool and timeout issues
- **Performance Problems**: Query optimization needs
- **Report Generation Failures**: Automated report issues

### Maintenance Procedures

#### Daily Tasks
1. **Check Alert Status**: Verify alert system functionality
2. **Review Submissions**: Monitor daily submission completeness
3. **Database Health**: Check for any data inconsistencies
4. **System Performance**: Monitor API response times

#### Weekly Tasks
1. **Generate Weekly Reports**: Ensure reports are sent correctly
2. **Data Cleanup**: Archive old submissions
3. **Performance Analysis**: Review system performance metrics
4. **Staff Feedback**: Collect feedback on system usability

#### Monthly Tasks
1. **Product Review**: Evaluate product additions/removals
2. **Threshold Updates**: Adjust reorder thresholds based on usage
3. **Supplier Review**: Evaluate supplier performance
4. **System Updates**: Apply security and feature updates

## Security and Compliance

### Data Security
- **Input Validation**: Prevent injection attacks
- **Authentication**: Secure staff authentication
- **Authorization**: Role-based access control
- **Data Encryption**: Encrypt sensitive inventory data

### Audit Trail
- **Submission Logging**: Complete audit trail of all submissions
- **Change Tracking**: Track all product and category changes
- **User Activity**: Log all user actions and access
- **System Events**: Log all automated system actions

## Future Enhancements

### Planned Features
- **Barcode Scanning**: Mobile barcode scanning for products
- **Photo Documentation**: Photo evidence for condition reporting
- **Predictive Analytics**: AI-powered demand forecasting
- **Supplier Integration**: Direct integration with supplier systems

### Technical Improvements
- **Real-Time Sync**: Real-time data synchronization
- **Enhanced Mobile App**: Native mobile application
- **Advanced Analytics**: Machine learning for pattern recognition
- **IoT Integration**: Sensor-based automatic inventory tracking

## Development Guidelines

### Adding New Product Types

1. **Define Input Schema**: Specify input type and validation rules
2. **Update UI Components**: Create or modify input components
3. **Implement Validation**: Add server-side validation logic
4. **Update Reports**: Modify reporting logic for new data types
5. **Test Integration**: Comprehensive testing across all features

### Customizing Reports

1. **Define Report Structure**: Specify data requirements
2. **Create Report Template**: Design message template
3. **Implement Generation Logic**: Write report generation code
4. **Configure Scheduling**: Set up automated scheduling
5. **Test Delivery**: Verify report delivery via LINE

### Performance Optimization

1. **Database Indexing**: Optimize query performance
2. **Caching Strategy**: Implement appropriate caching
3. **API Rate Limiting**: Prevent system overload
4. **Background Processing**: Move heavy tasks to background
5. **Mobile Optimization**: Optimize for mobile performance 