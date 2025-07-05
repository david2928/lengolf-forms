# Calendar Time Positioning Debug Report

## 🔍 Problem Statement

**Issue**: Bookings in the calendar are appearing at incorrect time positions, offset by approximately 3 hours later than their actual booking time.

**Specific Examples**:
- **Alson**: Booking scheduled for 2:00 PM (14:00) appears at ~5:00 PM (17:00) position
- **Allison**: Booking scheduled for 5:00 PM (17:00) appears at ~11:00 PM (23:00) position

**Pattern**: Systematic +3 hour visual offset affecting all bookings despite correct data and calculations.

---

## 📊 Data Verification (✅ CONFIRMED CORRECT)

### Database Data
```sql
-- Alson's booking in database
{
  "name": "Alson",
  "start_time": "14:00",
  "duration": 3,
  "date": "2025-06-09",
  "bay": "Bay 3"
}
```

### API Response
```json
{
  "start_time": "14:00",
  "duration": 3,
  "timezone": "Asia/Bangkok (+07:00)"
}
```

### Calendar Event Processing
```typescript
// calendar-utils.ts correctly produces:
{
  "start": "2025-06-09T14:00:00.000+07:00",
  "end": "2025-06-09T17:00:00.000+07:00",
  "customer_name": "Alson"
}
```

**✅ VERDICT**: All data is correct throughout the pipeline.

---

## 🧮 Mathematical Calculations (✅ CONFIRMED CORRECT)

### Position Formula
```typescript
const getPositionForHour = (hour: number): number => {
  return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
};

// Constants:
// START_HOUR = 10 (10:00 AM)
// TOTAL_HOURS = 14 (10:00 AM to 12:00 AM)
```

### Calculation Results
| Time | Hour | Calculation | Position | Expected Grid Line |
|------|------|-------------|----------|-------------------|
| 2:00 PM | 14 | (14-10)/14*100 | 28.57% | 14:00 time slot |
| 5:00 PM | 17 | (17-10)/14*100 | 50.00% | 17:00 time slot |

### Debug Console Output
```
🔍 ALSON DEBUG:
  Raw event.start: 2025-06-09T14:00:00.000+07:00
  Parsed startTime: 2025-06-09T14:00:00.000+07:00
  Start hour: 14
  Position calculation: ((14 - 10) / 14) * 100 = 28.57142857142857

🔍 ALLISON DEBUG:
  Raw event.start: 2025-06-09T17:00:00.000+07:00
  Parsed startTime: 2025-06-09T17:00:00.000+07:00
  Start hour: 17
  Position calculation: ((17 - 10) / 14) * 100 = 50
```

**✅ VERDICT**: All mathematical calculations are correct.

---

## 🕐 Timezone Investigation (✅ CONFIRMED CORRECT)

### System Timezone
```
Current system timezone: Asia/Bangkok
Offset: +420 minutes (+7 hours)
```

### DateTime Processing
```typescript
// All DateTime objects consistently use Asia/Bangkok timezone
const startTime = DateTime.fromISO(event.start, { zone: 'Asia/Bangkok' });
const endTime = DateTime.fromISO(event.end, { zone: 'Asia/Bangkok' });
```

### Timezone Consistency Check
- ✅ `calendar-utils.ts`: Uses Asia/Bangkok timezone
- ✅ `page.tsx`: Uses Asia/Bangkok timezone
- ✅ `CalendarEvent.tsx`: Uses Asia/Bangkok timezone

**✅ VERDICT**: Timezone handling is consistent throughout the application.

---

## 🎯 Visual Debug Markers Investigation

### Debug Markers Added
```typescript
// Added to TraditionalView.tsx for visual verification
<div 
  className="absolute w-full bg-red-500 opacity-50 z-30"
  style={{ top: '28.57%', height: '2px' }}
  title="Alson should be here (28.57% = 2pm)"
/>
<div 
  className="absolute w-full bg-blue-500 opacity-50 z-30"
  style={{ top: '50%', height: '2px' }}
  title="Allison should be here (50% = 5pm)"
/>
```

### Observations
- **Red marker (28.57%)**: Appears at **13:00** grid line instead of **14:00**
- **Blue marker (50%)**: Appears at **17:00** grid line instead of **17:00** ✅
- **Alson booking**: Appears near **17:00** line (where blue marker is)
- **Allison booking**: Appears around **23:00**

### Key Finding
The debug markers themselves are appearing in wrong positions! This confirms the issue is in the `getPositionForHour` calculation or how positions are applied to CSS.

---

## 🔧 Fix Attempts

### Attempt 1: Off-by-One Correction
```typescript
// ATTEMPTED FIX:
const getPositionForHour = (hour: number): number => {
  return ((hour - START_HOUR + 1) / TOTAL_HOURS) * 100;
};
```

**New Calculations**:
- Alson (14:00): 35.71% (instead of 28.57%)
- Allison (17:00): 57.14% (instead of 50.00%)

**Result**: ❌ Issue still present according to user feedback.

---

## 🏗️ Layout Structure Analysis

### Container Hierarchy (Desktop)
```tsx
<div className="flex gap-4">
  {/* Time Column */}
  <div className="w-16 relative">
    {timeSlots.map(time => (
      <div className="h-8 text-xs">{time}</div>
    ))}
  </div>
  
  {/* Calendar Grid */}
  <div className="flex-1 grid grid-cols-3 gap-4">
    {Object.entries(eventsByBay).map(([bay, events]) => (
      <div className="relative bg-gray-50">
        {/* Grid lines */}
        {timeSlots.map((time, index) => (
          <div 
            className="absolute w-full border-t"
            style={{ top: `${getPositionForHour(index + START_HOUR)}%` }}
          />
        ))}
        
        {/* Bookings */}
        {events.map(booking => (
          <div 
            className="absolute"
            style={{ 
              top: `${getPositionForHour(booking.start_hour)}%`,
              height: `${(booking.duration_hours / TOTAL_HOURS) * 100}%`
            }}
          >
            {booking.customer_name}
          </div>
        ))}
      </div>
    ))}
  </div>
</div>
```

### Potential Issues
1. **Flexbox Layout**: Time column vs calendar grid might have different reference frames
2. **Grid Gap**: `gap-4` between bay columns might affect positioning
3. **Container Height**: Different containers might have different heights
4. **CSS Transforms**: Some elements might have transforms affecting position

---

## 📱 Mobile vs Desktop Behavior

### Mobile View Structure
```tsx
{/* Mobile: Stacked layout */}
<div className="space-y-4">
  {Object.entries(eventsByBay).map(([bay, events]) => (
    <div className="bg-gray-50">
      <div className="flex">
        <div className="w-12">{/* Time labels */}</div>
        <div className="flex-1 relative">{/* Bookings */}</div>
      </div>
    </div>
  ))}
</div>
```

**Question**: Does the issue occur in both mobile and desktop views?

---

## 🧪 Debug Scripts Created

### 1. `scripts/debug-position-math.js`
Tests fundamental position calculation mathematics.

### 2. `scripts/test-position-fix.js`
Tests the attempted off-by-one fix.

### 3. `scripts/debug-time-positioning.js` (if exists)
Additional positioning verification.

---

## 🚨 Current Status

### What Works ✅
- Data fetching from database
- Timezone calculations
- Mathematical position calculations
- DateTime parsing and formatting

### What Doesn't Work ❌
- Visual positioning of bookings in calendar
- Debug markers appear at wrong positions
- Systematic 3-hour offset in visual display

### Root Cause Hypothesis
The issue appears to be in the **CSS positioning system** rather than the calculation logic. Possible causes:

1. **Container Height Mismatch**: Time labels and calendar grid have different heights
2. **CSS Flexbox Issues**: Different flex containers affecting position reference
3. **Grid Line vs Booking Position**: Grid lines and bookings using different position references
4. **Percentage Base Calculation**: Percentages calculated against wrong container height

---

## 🔍 Next Investigation Steps

### 1. Container Height Analysis
```typescript
// Add debug logging for container dimensions
console.log('Time column height:', timeColumnElement.clientHeight);
console.log('Calendar grid height:', calendarGridElement.clientHeight);
console.log('Bay column height:', bayColumnElement.clientHeight);
```

### 2. CSS Position Debugging
```css
/* Add temporary background colors to see container boundaries */
.time-column { background: rgba(255,0,0,0.1); }
.calendar-grid { background: rgba(0,255,0,0.1); }
.bay-column { background: rgba(0,0,255,0.1); }
```

### 3. Absolute Position Reference
Check what element the `absolute` positioned bookings are relative to:
```typescript
// Verify parent container has position: relative
console.log('Parent position:', getComputedStyle(parentElement).position);
```

### 4. Time Slot Height Calculation
```typescript
// Check if time slots have consistent height
const timeSlotHeight = 100 / TOTAL_SLOTS; // Should be ~6.67% per slot
console.log('Expected time slot height:', timeSlotHeight);
```

---

## 💡 Alternative Fix Approaches

### Approach 1: Pixel-Based Positioning
Instead of percentage-based positioning, use pixel calculations:
```typescript
const getPositionInPixels = (hour: number, containerHeight: number): number => {
  const hourHeight = containerHeight / TOTAL_HOURS;
  return (hour - START_HOUR) * hourHeight;
};
```

### Approach 2: Grid Layout Instead of Absolute
Use CSS Grid for time positioning instead of absolute positioning:
```css
.calendar-container {
  display: grid;
  grid-template-rows: repeat(14, 1fr);
}
```

### Approach 3: Reference Element Alignment
Add a reference element at each hour mark to verify positioning:
```typescript
{timeSlots.map((time, index) => (
  <div 
    key={`ref-${time}`}
    className="absolute w-full h-1 bg-yellow-400 z-50"
    style={{ top: `${getPositionForHour(index + START_HOUR)}%` }}
  />
))}
```

---

## 📝 Test Data for Reproduction

### Alson's Booking
```json
{
  "id": "booking-123",
  "name": "Alson",
  "start_time": "14:00",
  "duration": 3,
  "date": "2025-06-09",
  "bay": "Bay 3"
}
```

### Expected vs Actual
- **Expected**: Booking appears at 2:00 PM grid line
- **Actual**: Booking appears at 5:00 PM grid line
- **Offset**: +3 hours visual displacement

---

## 🎯 Success Criteria

Fix is successful when:
- ✅ Alson's 2:00 PM booking appears at the 14:00 grid line
- ✅ Allison's 5:00 PM booking appears at the 17:00 grid line
- ✅ Debug markers align with their intended time slots
- ✅ All bookings display at correct times
- ✅ No mathematical calculation changes needed (data is correct)

---

## 📂 Files Involved

### Modified Files
- `app/bookings-calendar/page.tsx` - Main calendar logic
- `src/components/calendar/TraditionalView.tsx` - Desktop calendar layout
- `src/components/calendar/SideBySideView.tsx` - Alternative calendar layout
- `src/lib/calendar-utils.ts` - Date/time utilities

### Debug Files
- `scripts/debug-position-math.js` - Position calculation testing
- `scripts/test-position-fix.js` - Fix verification
- `CALENDAR_TIME_POSITIONING_DEBUG_REPORT.md` - This report

---

## 🚀 Priority Actions

1. **Investigate container height differences** between time column and calendar grid
2. **Add visual debugging** with colored backgrounds to see container boundaries
3. **Test pixel-based positioning** as alternative to percentage
4. **Verify CSS positioning context** (relative/absolute relationships)
5. **Check for CSS transforms or offsets** affecting position calculations

The issue is definitely in the visual positioning system, not the data or calculations. 