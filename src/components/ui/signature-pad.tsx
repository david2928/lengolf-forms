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
      height: height,
      border: `3px solid ${isActive ? '#2563eb' : '#fde68a'}`,
      borderRadius: '12px',
      background: '#fffde7',
      boxShadow: isActive ? '0 0 0 3px #2563eb33' : '0 2px 4px 0 #0002',
      display: 'block',
      cursor: 'crosshair',
      transition: 'all 0.2s ease-in-out',
    };

    return (
      <div className={`flex flex-col items-center w-full ${className || ''}`} style={containerStyle}>
        <div className="w-full" style={{marginBottom: '0.75rem'}}>
          <SignatureCanvas
            ref={sigCanvas}
            penColor='black'
            canvasProps={{
              width: undefined, // Let style handle width
              height: height,
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
          className="px-4 py-2 text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
        >
          Clear Signature
        </Button>
      </div>
    );
  });

SignaturePad.displayName = 'SignaturePad';

export { SignaturePad }; 