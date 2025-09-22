import { useEffect, useRef } from 'react';
import { Reply, Copy } from 'lucide-react';

interface MessageContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onReply: () => void;
  onCopy?: () => void;
  position: { x: number; y: number };
  messageText?: string;
  isOwnMessage?: boolean; // Whether message is from current user (right side)
  messageElement?: HTMLElement; // Reference to the message element for better positioning
}

export function MessageContextMenu({
  isOpen,
  onClose,
  onReply,
  onCopy,
  position,
  messageText,
  isOwnMessage = false,
  messageElement
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

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!messageText) return;

    try {
      await navigator.clipboard.writeText(messageText);
      if (onCopy) {
        onCopy();
      }
    } catch (err) {
      // Fallback for older browsers or when clipboard API fails
      const textArea = document.createElement('textarea');
      textArea.value = messageText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        if (onCopy) {
          onCopy();
        }
      } catch (fallbackErr) {
        console.error('Failed to copy text:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
    onClose();
  };

  // Smart positioning to avoid blocking message content
  const getOptimalPosition = () => {
    const menuWidth = 140; // Approximate menu width
    const menuHeight = 80; // Approximate menu height
    const margin = 10; // Margin from viewport edges

    let x = position.x;
    let y = position.y;

    // If we have the message element, position relative to it
    if (messageElement) {
      const messageRect = messageElement.getBoundingClientRect();

      // Try to position above the message first
      if (messageRect.top - menuHeight - margin > 0) {
        // Position above the message
        y = messageRect.top - menuHeight - margin;
        // Center horizontally on the message
        x = messageRect.left + (messageRect.width / 2) - (menuWidth / 2);
      } else {
        // If not enough space above, position to the side
        if (isOwnMessage) {
          // For own messages (right side), position to the left of the message
          x = messageRect.left - menuWidth - margin;
          y = messageRect.top;
        } else {
          // For other messages (left side), position to the right of the message
          x = messageRect.right + margin;
          y = messageRect.top;
        }
      }
    } else {
      // Fallback positioning based on click position
      y = position.y - 60; // Position above click point
      if (isOwnMessage) {
        x = position.x - menuWidth - margin; // Position to the left for own messages
      } else {
        x = position.x + margin; // Position to the right for other messages
      }
    }

    // Ensure menu stays within viewport bounds
    x = Math.max(margin, Math.min(x, window.innerWidth - menuWidth - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - menuHeight - margin));

    return { x, y };
  };

  const adjustedPosition = getOptimalPosition();

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
      {messageText && (
        <button
          onClick={handleCopy}
          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Copy className="h-4 w-4 mr-2 text-gray-500" />
          Copy Text
        </button>
      )}
    </div>
  );
}