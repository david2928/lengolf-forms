import { X, Reply, Image as ImageIcon, FileText, Users } from 'lucide-react';

interface ReplyPreviewProps {
  message: {
    id: string;
    text?: string;
    type: string;
    senderName?: string;
    fileName?: string;
    senderType: 'user' | 'admin';
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
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 mx-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* Single reply icon */}
          <div className="flex-shrink-0 flex items-center text-blue-600">
            <Reply className="h-4 w-4" />
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-medium text-blue-700">
                Replying to {message.senderType === 'admin' ? 'Admin' : message.senderName || 'User'}
              </span>
            </div>
            <div className="text-sm text-gray-700 truncate">
              {getPreviewText()}
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-blue-100 rounded transition-colors"
          title="Cancel reply"
        >
          <X className="h-4 w-4 text-blue-600" />
        </button>
      </div>
    </div>
  );
}