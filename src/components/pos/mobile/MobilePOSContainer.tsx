"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, Menu, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileView = 'categories' | 'products' | 'order' | 'checkout';

interface MobilePOSContainerProps {
  children: React.ReactNode;
  currentView: MobileView;
  onViewChange: (view: MobileView) => void;
  orderItemCount: number;
  totalAmount: number;
}

const MobilePOSContainer: React.FC<MobilePOSContainerProps> = ({
  children,
  currentView,
  onViewChange,
  orderItemCount,
  totalAmount
}) => {
  const [isOrderPanelExpanded, setIsOrderPanelExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    
    if (offset.y < -100) {
      // Swipe up - expand order panel
      setIsOrderPanelExpanded(true);
    } else if (offset.y > 100) {
      // Swipe down - collapse order panel
      setIsOrderPanelExpanded(false);
    }
    
    setDragY(0);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragY(info.offset.y);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'categories': return 'Select Category';
      case 'products': return 'Select Products';
      case 'order': return 'Current Order';
      case 'checkout': return 'Checkout';
      default: return 'POS';
    }
  };

  const canGoBack = currentView !== 'categories';

  return (
    <div className="h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          {canGoBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (currentView === 'products') onViewChange('categories');
                if (currentView === 'order') onViewChange('products');
                if (currentView === 'checkout') onViewChange('order');
              }}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">{getViewTitle()}</h1>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <Settings className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ 
          marginBottom: currentView === 'order' ? '0px' : isOrderPanelExpanded ? '0px' : '120px' 
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Order Button (when order panel is collapsed) */}
      {currentView !== 'order' && !isOrderPanelExpanded && orderItemCount > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="absolute bottom-4 left-4 right-4 z-30"
        >
          <Card 
            className="p-4 bg-green-600 text-white shadow-lg cursor-pointer"
            onClick={() => onViewChange('order')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">
                    {orderItemCount} item{orderItemCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm opacity-90">
                    ฿{totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                View Order
              </Badge>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Expandable Order Panel */}
      {currentView !== 'order' && orderItemCount > 0 && (
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={{
            y: isOrderPanelExpanded ? 0 : dragY,
            height: isOrderPanelExpanded ? '100%' : '120px'
          }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed inset-x-0 bottom-0 bg-white shadow-2xl z-50",
            "rounded-t-2xl border-t border-gray-200"
          )}
          style={{
            transform: `translateY(${isOrderPanelExpanded ? 0 : dragY}px)`
          }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center py-2 cursor-grab active:cursor-grabbing">
            <div className="w-8 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Order Panel Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Current Order</h3>
                <p className="text-sm text-gray-600">
                  {orderItemCount} item{orderItemCount !== 1 ? 's' : ''} • ฿{totalAmount.toFixed(2)}
                </p>
              </div>
              
              {isOrderPanelExpanded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOrderPanelExpanded(false)}
                >
                  Minimize
                </Button>
              )}
            </div>
          </div>

          {/* Order Content */}
          <div className={cn(
            "overflow-y-auto",
            isOrderPanelExpanded ? "h-full pb-32" : "h-0"
          )}>
            {/* Order items will be rendered here */}
            <div className="p-4 space-y-3">
              {/* Order items component will go here */}
            </div>
          </div>

          {/* Quick Actions (when collapsed) */}
          {!isOrderPanelExpanded && (
            <div className="px-4 pb-4">
              <div className="flex space-x-2">
                <Button
                  className="flex-1"
                  onClick={() => onViewChange('order')}
                >
                  View Full Order
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onViewChange('checkout')}
                  className="flex-1"
                >
                  Checkout
                </Button>
              </div>
            </div>
          )}

          {/* Checkout Button (when expanded) */}
          {isOrderPanelExpanded && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
              <Button
                className="w-full"
                size="lg"
                onClick={() => onViewChange('checkout')}
              >
                Proceed to Checkout • ฿{totalAmount.toFixed(2)}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default MobilePOSContainer;