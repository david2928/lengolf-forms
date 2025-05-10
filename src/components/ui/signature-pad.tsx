'use client'

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './button';

interface SignaturePadProps {
  width?: number;
  height?: number;
}

export interface SignaturePadRef {
  getSignature: () => string | null;
  clearSignature: () => void;
  isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>((
  { width = 500, height = 200 }, 
  ref
) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

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

  return (
    <div className="flex flex-col items-center space-y-2">
      <div style={{ width, height, border: '1px solid #ccc', borderRadius: '4px' }}>
        <SignatureCanvas
          ref={sigCanvas}
          penColor='black'
          canvasProps={{ width, height, className: 'sigCanvas' }}
          backgroundColor='rgb(255,255,255)'
        />
      </div>
      <Button variant="outline" size="sm" onClick={() => sigCanvas.current?.clear()}>
        Clear Signature
      </Button>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export { SignaturePad }; 