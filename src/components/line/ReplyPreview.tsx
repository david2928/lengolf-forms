import { X, Reply, Image as ImageIcon, FileText, Users } from 'lucide-react';
import Image from 'next/image';

interface ReplyPreviewProps {
  message: {
    id: string;
    text?: string;
    type: string;
    senderName?: string;
    senderType: 'user' | 'admin';
    pictureUrl?: string;
    fileName?: string;
  };
  onClose: () => void;
}

export function ReplyPreview({ message, onClose }: ReplyPreviewProps) {
  // Generate preview text based on message type
  const getPreviewText = () => {
    switch (message.type) {
      case 'image':
        return '📷 Photo';
      case 'sticker':
        return '🎨 Sticker';
      case 'file':
        return `📄 ${message.fileName || 'File'}`;
      case 'video':
        return '🎥 Video';
      case 'audio':
        return '🎵 Audio';
      default:
        // For text messages, show first 50 characters
        if (message.text) {
          return message.text.length > 50
            ? message.text.substring(0, 50) + '...'
            : message.text;
        }
        return 'Message';
    }
  };

  // Get preview icon based on message type
  const getPreviewIcon = () => {
    switch (message.type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'sticker':
        return <span className="text-sm">🎨</span>;
      case 'file':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <span className="text-sm">🎥</span>;
      case 'audio':
        return <span className="text-sm">🎵</span>;
      default:
        return <Reply className="h-4 w-4" />;
    }
  };

  return (
    <div className="px-4 pt-1 pb-1">
      <div className="flex items-start space-x-2">
        {/* Profile image - smaller */}
        <div className="w-5 h-5 rounded-full flex-shrink-0 overflow-hidden">
          {message.senderType === 'admin' ? (
            <Image
              src="/favicon.svg"
              alt="LENGOLF"
              width={20}
              height={20}
              className="w-full h-full object-cover"
            />
          ) : message.pictureUrl ? (
            <Image
              src={message.pictureUrl}
              alt={message.senderName || 'User'}
              width={20}
              height={20}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <Users className="w-3 h-3 text-gray-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="text-[11px] font-black text-gray-900 mb-0.5" style={{ fontWeight: 900 }}>
            {message.senderType === 'admin' ? 'LENGOLF' : message.senderName || 'User'}
          </div>
          {/* Message */}
          <div className="text-[11px] text-gray-600">
            {getPreviewText()}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-gray-100 rounded self-center"
          title="Cancel reply"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}