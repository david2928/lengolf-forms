# Dolly's Hours Analysis - May 2025

Based on the existing payroll system and the fixes we've implemented, here's what we know about Dolly's hours:

## System Changes Made:
1. **OT Calculation Fixed**: Changed from Monday-Sunday to Sunday-Saturday weeks
2. **Timezone Issues Fixed**: Proper Bangkok timezone handling for May 2025
3. **Review Tab Fixed**: Interface now shows actual data instead of blank entries

## Expected Hours Structure:

### Weekly Calculation Method (Sunday-Saturday):
- **Regular Hours**: Up to 48 hours per week
- **Overtime Hours**: Any hours over 48 in a single week
- **Holiday Hours**: Work performed on Thai public holidays

### May 2025 Thai Public Holidays:
- **May 1**: Labour Day
- **May 5**: Coronation Day  
- **May 12**: Visakha Bucha Day

## To Get Dolly's Actual Hours:

### Method 1: Admin Panel (Browser Console)
1. Navigate to: `/admin/payroll-calculations`
2. Select: "May 2025" 
3. Run in browser console:
```javascript
// Get payroll data
fetch('/api/admin/payroll/2025-05/calculations')
  .then(r => r.json())
  .then(data => {
    const dolly = data.staff_payroll?.find(s => s.staff_name?.toLowerCase() === 'dolly');
    if (dolly) {
      console.log('DOLLY HOURS - MAY 2025');
      console.log('======================');
      console.log('Total Hours:', dolly.regular_hours.toFixed(2));
      console.log('Regular Hours:', (dolly.regular_hours - dolly.ot_hours).toFixed(2));
      console.log('Overtime Hours:', dolly.ot_hours.toFixed(2));
      console.log('Working Days:', dolly.working_days);
      console.log('Holiday Hours:', dolly.holiday_hours?.toFixed(2) || '0.00');
      console.log('---');
      console.log('Base Salary: ฿' + dolly.base_salary.toFixed(2));
      console.log('OT Pay: ฿' + dolly.ot_pay.toFixed(2));
      console.log('Holiday Pay: ฿' + (dolly.holiday_pay || 0).toFixed(2));
      console.log('Total Payout: ฿' + dolly.total_payout.toFixed(2));
    }
  });
```

### Method 2: Review Tab
1. Go to: `/admin/payroll-calculations`
2. Select: "May 2025"
3. Click: "Review" tab
4. Filter by: "Dolly"
5. View: Daily time entries and flagged issues

## Key Metrics to Look For:

### Weekly Pattern:
- **Week 1 (Apr 27 - May 3)**: [X] hours (regular: [Y], OT: [Z])
- **Week 2 (May 4 - May 10)**: [X] hours (regular: [Y], OT: [Z])  
- **Week 3 (May 11 - May 17)**: [X] hours (regular: [Y], OT: [Z])
- **Week 4 (May 18 - May 24)**: [X] hours (regular: [Y], OT: [Z])
- **Week 5 (May 25 - May 31)**: [X] hours (regular: [Y], OT: [Z])

### Monthly Summary:
- **Total Regular Hours**: Sum of min(48, weekly_hours) for each week
- **Total Overtime Hours**: Sum of max(0, weekly_hours - 48) for each week
- **Grand Total**: Regular + Overtime
- **Working Days**: Days with >= 6 hours worked

## Expected Format:
```
DOLLY'S HOURS - MAY 2025
========================
Total Hours: [X.XX]
Regular Hours: [Y.YY] 
Overtime Hours: [Z.ZZ]
Working Days: [N]
Holiday Hours: [H.HH]

PAYROLL BREAKDOWN
=================
Base Salary: ฿[XXXX.XX]
Overtime Pay: ฿[XXX.XX]
Holiday Pay: ฿[XX.XX]
Service Charge: ฿[XXX.XX]
Total Payout: ฿[YYYY.XX]
```

## Notes:
- The system now correctly uses **Sunday-Saturday** weeks for OT calculation
- **Holiday pay** is calculated at special rates for May 1, 5, and 12
- **Service charge** is distributed equally among eligible staff
- All calculations use **Bangkok timezone** (UTC+7)

Run the browser console method above to get the actual numbers! 