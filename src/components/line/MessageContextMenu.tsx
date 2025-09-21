import { useEffect, useRef } from 'react';
import { Reply } from 'lucide-react';

interface MessageContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onReply: () => void;
  position: { x: number; y: number };
}

export function MessageContextMenu({
  isOpen,
  onClose,
  onReply,
  position
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Handle scroll to close menu
    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Adjust position to keep menu within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 140), // 140px is approx menu width
    y: Math.max(10, position.y - 50) // Offset above click point, but not above viewport
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      <button
        onClick={() => {
          onReply();
          onClose();
        }}
        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Reply className="h-4 w-4 mr-2 text-gray-500" />
        Reply
      </button>
    </div>
  );
}