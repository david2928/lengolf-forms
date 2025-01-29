# Package Monitor Feature - Objectives and Deliverables

## Primary Objective
Create a new feature that allows employees to easily monitor active packages, with special emphasis on Diamond packages and packages nearing expiration.

## Key Features

### 1. Navigation Enhancement
- Add new button to main navigation bar that displays:
  - Number of active Diamond packages with 💎 emoji
  - Number of packages expiring within 7 days with ⏰ emoji
- Button should link to the new package monitor page

### 2. Package Monitor Page
The page consists of three main sections:

#### A. Diamond Packages Section
- Grid display of all active Diamond packages (package_type_id 7 and 11)
- Each package card shows:
  - Customer name
  - Purchase date
  - Expiration date
  - Employee assigned

#### B. Expiring Packages Section
- Grid display of all packages expiring within 7 days
- Visual indicators for urgency:
  - Packages expiring within 2 days
  - Packages expiring within 7 days

#### C. Customer Package History
- Customer selector (similar to existing implementation)
- Only shows customers who have ever purchased packages
- Toggle between:
  - Active packages
  - Expired/used packages
- Displays selected customer's package history in grid format

## Technical Deliverables

### 1. Database
- New database function `get_package_monitor_data()`
- New database function `get_customer_packages()`

### 2. API Endpoints
- `GET /api/packages/monitor` for dashboard data
- `GET /api/packages/customer/[id]` for customer package history

### 3. Frontend Components
- Navigation button component
- Package grid component
- Customer selector component
- Package card component

### 4. Pages
- New route `/package-monitor`

## Data Requirements
Working with existing tables:
- packages
- package_types
- Utilizing customer data for package history

## Success Criteria
1. Employees can quickly see number of active Diamond packages
2. Employees can identify packages expiring soon
3. Employees can easily look up any customer's package history
4. Interface matches existing application design
5. Performance remains smooth with large dataset