# Schedule Visualization Responsive Design

This document outlines the responsive design implementation for the schedule visualization components.

## Breakpoints

The schedule visualization uses a mobile-first approach with the following breakpoints:

| Breakpoint | Min Width | Description |
|------------|-----------|-------------|
| Mobile     | 0px       | Small phones and devices |
| Tablet     | 768px     | Tablets and large phones |
| Desktop    | 1024px    | Desktop computers and laptops |
| Wide       | 1440px    | Large desktop screens |

## Responsive Features

### Mobile (0px - 767px)
- **Horizontal scrolling**: Grid scrolls horizontally to accommodate all days
- **Compact mode**: Abbreviated day names, smaller fonts
- **Touch-friendly**: Minimum 48px touch targets
- **Simplified display**: Location information hidden to save space
- **Sticky time labels**: Time column stays visible during horizontal scroll

### Tablet (768px - 1023px)
- **Horizontal scrolling**: Still enabled for better usability
- **Full information**: Shows minutes and location details
- **Medium sizing**: Balanced between mobile and desktop
- **Smooth scrolling**: Enhanced scroll behavior

### Desktop (1024px+)
- **No horizontal scrolling**: Full grid fits within viewport
- **Full feature set**: All information displayed
- **Optimal spacing**: Comfortable reading and interaction
- **Hover effects**: Enhanced hover states for mouse users

### Wide Desktop (1440px+)
- **Spacious layout**: Extra padding and larger fonts
- **Enhanced readability**: Larger text and more breathing room
- **Premium experience**: Best visual presentation

## Component Adaptations

### TimelineGrid
```typescript
// Responsive grid columns
const gridTemplateColumns = responsiveConfig.gridColumns
const gridTemplateRows = `auto repeat(14, ${responsiveConfig.timeSlotHeight}px)`

// Conditional scrolling
className={`
  ${responsiveConfig.scrollable ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'}
  ${responsiveConfig.compactMode ? 'text-sm' : ''}
`}
```

### TimelineHeader
```typescript
// Responsive day names
{responsiveConfig.compactMode ? dayLabel.day.slice(0, 3) : dayLabel.day}

// Responsive font sizes
className={`${responsiveConfig.compactMode ? 'text-xs' : 'text-sm'}`}
```

### StaffScheduleBlock
```typescript
// Responsive block sizing
style={{
  minHeight: `${blockHeight}px`,
  fontSize: responsiveConfig.fontSize,
  padding: `${responsiveConfig.blockPadding}px`
}}

// Conditional location display
{schedule.location && blockHeight > 80 && responsiveConfig.showLocation && (
  <div className="location-display">
    📍 {schedule.location}
  </div>
)}
```

## CSS Media Queries

### Mobile-First Approach
```css
/* Base styles (mobile) */
.timeline-grid {
  font-size: 0.75rem;
  min-width: 800px;
}

/* Tablet and up */
@media (min-width: 768px) {
  .timeline-grid {
    font-size: 0.875rem;
    min-width: 900px;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .timeline-grid {
    font-size: 0.875rem;
    overflow: hidden;
  }
}
```

### Touch Device Optimizations
```css
/* Touch-friendly scrolling */
.timeline-grid {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

/* Minimum touch targets */
.staff-schedule-block {
  min-height: 48px;
}
```

## Accessibility Considerations

### High Contrast Mode
```css
@media (prefers-contrast: high) {
  .staff-schedule-block {
    border: 2px solid currentColor !important;
  }
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .staff-schedule-block {
    transition: none !important;
  }
}
```

### Dark Mode Support
```css
@media (prefers-color-scheme: dark) {
  .schedule-visualization-container {
    background-color: #1f2937;
    color: #f9fafb;
  }
}
```

## Performance Optimizations

### Mobile Performance
- **Horizontal scrolling**: Reduces layout complexity
- **Lazy loading**: Components render only when visible
- **Debounced updates**: Prevents excessive re-renders during resize
- **Touch optimizations**: Smooth scrolling and momentum

### Desktop Performance
- **No scrolling**: Eliminates scroll event listeners
- **Full rendering**: All content visible without virtualization
- **Hover optimizations**: Enhanced interaction feedback

## Testing Responsive Design

### Manual Testing
1. **Device Testing**: Test on actual devices when possible
2. **Browser DevTools**: Use responsive design mode
3. **Orientation Changes**: Test portrait and landscape modes
4. **Touch Interactions**: Verify touch targets and gestures

### Automated Testing
```typescript
// Test responsive configurations
describe('Responsive Design', () => {
  it('should adapt to mobile screens', () => {
    const config = getResponsiveConfig(320)
    expect(config.compactMode).toBe(true)
    expect(config.scrollable).toBe(true)
  })
})
```

## Browser Support

### Modern Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### CSS Features Used
- CSS Grid Layout
- Flexbox
- Media Queries
- CSS Custom Properties
- Viewport Units

### Fallbacks
- Graceful degradation for older browsers
- Progressive enhancement approach
- Feature detection where needed

## Best Practices

### Design Principles
1. **Mobile-first**: Start with mobile constraints
2. **Progressive enhancement**: Add features for larger screens
3. **Touch-friendly**: Adequate touch targets and gestures
4. **Performance-conscious**: Optimize for each device type

### Implementation Guidelines
1. **Use semantic breakpoints**: Based on content, not devices
2. **Test early and often**: Responsive design from the start
3. **Consider context**: How users interact on each device
4. **Maintain consistency**: Core functionality across all sizes

## Future Enhancements

### Planned Improvements
- **Container queries**: When browser support improves
- **Advanced touch gestures**: Pinch to zoom, swipe actions
- **Adaptive loading**: Different content based on connection speed
- **Dynamic breakpoints**: User-customizable layout preferences

### Experimental Features
- **Foldable device support**: Dual-screen layouts
- **AR/VR compatibility**: 3D visualization modes
- **Voice navigation**: Accessibility for hands-free use