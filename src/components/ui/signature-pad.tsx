'use client'

import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './button';

interface SignaturePadProps {
  width?: number;
  height?: number;
  className?: string;
  onEnd?: () => void;
  onClear?: () => void;
}

export interface SignaturePadRef {
  getSignature: () => string | null;
  clearSignature: () => void;
  isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ height = 220, className, onEnd, onClear }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isActive, setIsActive] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState(400); // Default width
    const [actualHeight, setActualHeight] = useState(height || 220);
    const containerRef = useRef<HTMLDivElement>(null);

    // Update canvas dimensions based on container
    React.useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          const container = containerRef.current;
          const containerWidth = container.offsetWidth;
          const containerHeight = container.offsetHeight;
          
          // Account for padding and borders
          const availableWidth = Math.max(containerWidth - 8, 300); // Minimum 300px
          setCanvasWidth(availableWidth);
          
          // If height is undefined or className includes h-full, use container height
          if (!height || className?.includes('h-full')) {
            const availableHeight = Math.max(containerHeight - 60, 200); // Account for clear button and margins
            setActualHeight(availableHeight);
          } else {
            setActualHeight(height);
          }
        }
      };

      // Initial calculation
      const timer = setTimeout(updateDimensions, 100);
      
      // Update on window resize
      window.addEventListener('resize', updateDimensions);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateDimensions);
      };
    }, [height, className]);

    useImperativeHandle(ref, () => ({
      getSignature: () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
          // Returns signature as a base64 encoded PNG
          return sigCanvas.current.toDataURL('image/png;base64');
        }
        return null;
      },
      clearSignature: () => {
        sigCanvas.current?.clear();
      },
      isEmpty: () => {
        return sigCanvas.current?.isEmpty() ?? true;
      }
    }));

    // Responsive width: 100% of parent, with adaptive max width based on device
    const containerStyle = {
      width: '100%',
      maxWidth: '100%', // Allow full width on tablets
    };
    
    const canvasStyle = {
      width: '100%',
      height: actualHeight,
      border: `3px solid ${isActive ? '#2563eb' : '#fde68a'}`,
      borderRadius: '12px',
      background: '#fffde7',
      boxShadow: isActive ? '0 0 0 3px #2563eb33' : '0 2px 4px 0 #0002',
      display: 'block',
      cursor: 'crosshair',
      transition: 'all 0.2s ease-in-out',
      maxWidth: '100%',
    };

    return (
      <div ref={containerRef} className={`flex flex-col items-center w-full h-full ${className || ''}`} style={containerStyle}>
        <div className="w-full flex-1" style={{marginBottom: '0.75rem', display: 'flex', flexDirection: 'column'}}>
          <SignatureCanvas
            ref={sigCanvas}
            penColor='black'
            canvasProps={{
              width: canvasWidth, // Use calculated width instead of undefined
              height: actualHeight,
              className: 'sigCanvas',
              style: canvasStyle,
              'aria-label': 'Signature area. Please sign using your finger.',
            }}
            backgroundColor='rgb(255,255,255)'
            onBegin={() => setIsActive(true)}
            onEnd={() => {
              setIsActive(false);
              if (onEnd) onEnd();
            }}
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            sigCanvas.current?.clear();
            if (onClear) onClear();
          }}
          className="px-4 py-2 text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors flex-shrink-0"
        >
          Clear Signature
        </Button>
      </div>
    );
  });

SignaturePad.displayName = 'SignaturePad';

export { SignaturePad }; 