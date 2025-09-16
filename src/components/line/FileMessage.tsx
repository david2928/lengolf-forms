import { useState } from 'react';
import { Download, FileText, File, Play, Music, Video, Archive, X, ExternalLink } from 'lucide-react';

interface FileMessageProps {
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  className?: string;
  showPreview?: boolean;
}

/**
 * Component to display file messages in LINE chat
 * Supports different file types with appropriate icons and preview options
 */
export function FileMessage({
  fileUrl,
  fileName,
  fileSize,
  fileType,
  className = "",
  showPreview = true
}: FileMessageProps) {
  const [downloadError, setDownloadError] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setDownloadError(true);
      setTimeout(() => setDownloadError(false), 3000);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';

    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;

    if (gb >= 1) {
      return `${gb.toFixed(1)}GB`;
    } else if (mb >= 1) {
      return `${mb.toFixed(1)}MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(0)}KB`;
    } else {
      return `${bytes}B`;
    }
  };

  const getFileIcon = () => {
    if (!fileType) return <File className="w-5 h-5" />;

    const type = fileType.toLowerCase();

    if (type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (type.includes('video')) {
      return <Video className="w-5 h-5 text-blue-500" />;
    } else if (type.includes('audio')) {
      return <Music className="w-5 h-5 text-green-500" />;
    } else if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
      return <Archive className="w-5 h-5 text-orange-500" />;
    } else if (type.includes('text') || type.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFileTypeLabel = () => {
    if (!fileType) return 'File';

    const type = fileType.toLowerCase();

    if (type.includes('pdf')) return 'PDF Document';
    if (type.includes('video')) return 'Video';
    if (type.includes('audio')) return 'Audio';
    if (type.includes('zip')) return 'ZIP Archive';
    if (type.includes('rar')) return 'RAR Archive';
    if (type.includes('text')) return 'Text Document';
    if (type.includes('document')) return 'Document';

    return 'File';
  };

  const canPreview = () => {
    if (!fileType) return false;
    const type = fileType.toLowerCase();
    return type.includes('pdf') || type.includes('video') || type.includes('audio');
  };

  const handlePreview = () => {
    if (!fileType) return;

    const type = fileType.toLowerCase();

    if (type.includes('pdf')) {
      setShowPdfViewer(true);
    } else if (type.includes('video') || type.includes('audio')) {
      // Open in new tab for video/audio
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <>
      <div className={`border border-gray-200 rounded-lg p-3 max-w-sm bg-white hover:border-gray-300 transition-colors ${className}`}>
        <div className="flex items-start space-x-3">
          {/* File icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getFileIcon()}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {fileName || 'Untitled'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {getFileTypeLabel()}
              {fileSize && <span className="ml-1">• {formatFileSize(fileSize)}</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 flex space-x-1">
            {showPreview && canPreview() && (
              <button
                onClick={handlePreview}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Preview"
              >
                {fileType?.includes('pdf') ? (
                  <ExternalLink className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              onClick={handleDownload}
              className={`p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors ${
                downloadError ? 'text-red-500' : ''
              }`}
              title={downloadError ? 'Download failed' : 'Download'}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {downloadError && (
          <div className="mt-2 text-xs text-red-500">
            Download failed. Please try again.
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {showPdfViewer && fileType?.includes('pdf') && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-6xl max-h-full bg-white rounded-lg">
            {/* Close button */}
            <button
              onClick={() => setShowPdfViewer(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            {/* PDF iframe */}
            <iframe
              src={fileUrl}
              className="w-full h-full rounded-lg"
              title={fileName || 'PDF Document'}
            />

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="absolute bottom-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Simplified file message for inline display (e.g., in conversation list)
 */
export function FileMessageInline({
  fileName,
  fileType,
  className = ""
}: {
  fileName?: string;
  fileType?: string;
  className?: string;
}) {
  const getFileIcon = () => {
    if (!fileType) return '📄';

    const type = fileType.toLowerCase();

    if (type.includes('pdf')) return '📋';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    if (type.includes('image')) return '🖼️';

    return '📄';
  };

  return (
    <div className={`inline-flex items-center text-gray-600 ${className}`}>
      <span className="text-sm mr-1">{getFileIcon()}</span>
      <span className="text-sm truncate">
        {fileName || 'File'}
      </span>
    </div>
  );
}