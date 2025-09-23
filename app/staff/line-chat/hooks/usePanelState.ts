// Panel state management hook extracted from main LINE chat component
// Manages the collapse/expand state of left and right panels

import { useState, useCallback } from 'react';
import type { PanelState } from '../utils/chatTypes';

/**
 * Custom hook for managing panel collapse state
 * Extracted from the main component to reduce useState hooks and improve organization
 */
export const usePanelState = (): PanelState => {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const togglePanel = useCallback((panel: 'left' | 'right') => {
    if (panel === 'left') {
      setLeftPanelCollapsed(prev => !prev);
    } else {
      setRightPanelCollapsed(prev => !prev);
    }
  }, []);

  return {
    leftPanelCollapsed,
    rightPanelCollapsed,
    togglePanel,
    setLeftPanelCollapsed,
    setRightPanelCollapsed
  };
};