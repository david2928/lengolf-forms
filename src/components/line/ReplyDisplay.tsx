import { Reply, Image as ImageIcon, FileText } from 'lucide-react';
import Image from 'next/image';

interface ReplyDisplayProps {
  repliedToMessage: {
    id: string;
    text?: string;
    type: string;
    senderName?: string;
    senderType?: string;
    pictureUrl?: string;
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
      className={`mb-2 ${
        onClickReply ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClickReply}
    >
      {/* Original message preview - subtle */}
      <div className="flex items-center space-x-2 mb-2">
        {/* Small profile image - centered */}
        <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center">
          {repliedToMessage.senderType === 'admin' ? (
            <Image
              src="/favicon.svg"
              alt="LENGOLF"
              width={14}
              height={14}
              className="w-full h-full object-cover"
            />
          ) : repliedToMessage.pictureUrl ? (
            <Image
              src={repliedToMessage.pictureUrl}
              alt={repliedToMessage.senderName || 'User'}
              width={14}
              height={14}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <span className="text-xs">👤</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-[11px] font-bold text-gray-700 mb-0.5">
            {repliedToMessage.senderName || 'User'}
          </div>
          <div className="text-[11px] text-gray-600 truncate opacity-50">
            {displayText}
          </div>
        </div>
      </div>

      {/* Separator line */}
      <div className="border-t border-gray-200 mb-2"></div>
    </div>
  );
}