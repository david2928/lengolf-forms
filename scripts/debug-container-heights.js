console.log('=== CONTAINER HEIGHT DEBUGGING CODE ===');

console.log(`
Add this to your TraditionalView.tsx component to debug container heights:

// Add useRef imports
import { useRef, useEffect } from 'react';

// Add refs in component
const timeColumnRef = useRef<HTMLDivElement>(null);
const calendarGridRef = useRef<HTMLDivElement>(null);
const bayColumnRefs = useRef<Array<HTMLDivElement | null>>([]);

// Add useEffect for height debugging
useEffect(() => {
  if (timeColumnRef.current && calendarGridRef.current) {
    console.log('🔍 CONTAINER HEIGHT DEBUG:');
    console.log('Time column height:', timeColumnRef.current.clientHeight);
    console.log('Calendar grid height:', calendarGridRef.current.clientHeight);
    
    bayColumnRefs.current.forEach((ref, index) => {
      if (ref) {
        console.log(\`Bay \${index + 1} height:\`, ref.clientHeight);
      }
    });
    
    // Check if heights match
    const timeHeight = timeColumnRef.current.clientHeight;
    const gridHeight = calendarGridRef.current.clientHeight;
    const heightDiff = Math.abs(timeHeight - gridHeight);
    
    if (heightDiff > 10) {
      console.warn('⚠️ HEIGHT MISMATCH DETECTED!');
      console.warn(\`Time column: \${timeHeight}px, Grid: \${gridHeight}px, Diff: \${heightDiff}px\`);
    }
  }
}, [bookings]);

// Add refs to JSX elements:

// Time column:
<div ref={timeColumnRef} className="w-16 relative">

// Calendar grid:  
<div ref={calendarGridRef} className="flex-1 grid grid-cols-3 gap-4">

// Bay columns:
<div 
  ref={el => bayColumnRefs.current[bayIndex] = el}
  className="relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
>
`);

console.log(`
Also add this CSS debugging to see container boundaries:

/* Add to TraditionalView.tsx className props for visual debugging */
Time column: "w-16 relative bg-red-100 border-2 border-red-500"
Calendar grid: "flex-1 grid grid-cols-3 gap-4 bg-green-100 border-2 border-green-500"  
Bay columns: "relative bg-blue-100 border-2 border-blue-500 rounded-lg overflow-hidden"
`);

console.log(`
And add this to check absolute positioning context:

// Check positioning context
useEffect(() => {
  bayColumnRefs.current.forEach((ref, index) => {
    if (ref) {
      const styles = window.getComputedStyle(ref);
      console.log(\`Bay \${index + 1} position:\`, styles.position);
      console.log(\`Bay \${index + 1} parent position:\`, 
        ref.parentElement ? window.getComputedStyle(ref.parentElement).position : 'none');
    }
  });
}, []);
`); 