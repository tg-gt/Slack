'use client';

import Image from 'next/image';
import { FileText } from 'lucide-react';
import type { Attachment } from '@/lib/types/slack';

interface AttachmentPreviewProps {
  attachment: Attachment;
}

export default function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const isImage = attachment.type === 'image';
  const fileSize = `${(attachment.size / 1024 / 1024).toFixed(2)} MB`;

  if (isImage) {
    return (
      <div className="relative w-64 h-64">
        <Image
          src={attachment.url}
          alt={attachment.name}
          fill
          className="object-cover rounded-lg"
        />
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
    >
      <FileText className="h-8 w-8 text-gray-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.name}
        </p>
        <p className="text-sm text-gray-500">{fileSize}</p>
      </div>
    </a>
  );
} 