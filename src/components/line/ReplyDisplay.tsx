import { Reply, Image as ImageIcon, FileText } from 'lucide-react';

interface ReplyDisplayProps {
  repliedToMessage: {
    id: string;
    text?: string;
    type: string;
    senderName?: string;
    fileName?: string;
  };
  replyPreviewText?: string;
  replyPreviewType?: string;
  onClickReply?: () => void; // Optional callback to scroll to original message
  className?: string;
}

export function ReplyDisplay({
  repliedToMessage,
  replyPreviewText,
  replyPreviewType,
  onClickReply,
  className = ""
}: ReplyDisplayProps) {
  // Use preview text if available, otherwise generate from original message
  const displayText = replyPreviewText || (() => {
    switch (repliedToMessage.type) {
      case 'image':
        return '📷 Photo';
      case 'sticker':
        return '🎨 Sticker';
      case 'file':
        return `📄 ${repliedToMessage.fileName || 'File'}`;
      case 'video':
        return '🎥 Video';
      case 'audio':
        return '🎵 Audio';
      default:
        if (repliedToMessage.text) {
          return repliedToMessage.text.length > 30
            ? repliedToMessage.text.substring(0, 30) + '...'
            : repliedToMessage.text;
        }
        return 'Message';
    }
  })();

  return (
    <div
      className={`flex items-start space-x-2 p-2 bg-blue-50 border-l-2 border-blue-400 rounded mb-2 text-xs ${
        onClickReply ? 'cursor-pointer hover:bg-blue-100' : ''
      } ${className}`}
      onClick={onClickReply}
    >
      {/* Reply icon only */}
      <div className="flex items-center text-blue-500 flex-shrink-0">
        <Reply className="h-3 w-3" />
      </div>

      {/* Reply content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-blue-700 mb-1">
          {repliedToMessage.senderName || 'User'}
        </div>
        <div className="text-gray-700 truncate">
          {displayText}
        </div>
      </div>
    </div>
  );
}