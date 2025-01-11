'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import type { Message } from '@/lib/types/slack';
import { useAuth } from '@/lib/hooks/useAuth';
import AttachmentPreview from '../attachments/AttachmentPreview';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const { user } = useAuth();

  return (
    <div 
      className="group relative flex items-start space-x-3 py-2 hover:bg-gray-50"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex-shrink-0">
        <Image
          src={message.userAvatar || '/default-avatar.png'}
          alt={message.userName || 'User'}
          width={40}
          height={40}
          className="rounded-full"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{message.userName}</span>
          <span className="text-xs text-gray-500">
            {format(new Date(message.createdAt), 'h:mm a')}
          </span>
          {message.isEdited && (
            <span className="text-xs text-gray-500">(edited)</span>
          )}
        </div>

        <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</p>

        {message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {showActions && (
          <div className="absolute right-0 top-0 flex items-center space-x-2 bg-white shadow-sm rounded-md p-1">
            <button className="p-1 hover:bg-gray-100 rounded">
              <MessageCircle className="h-4 w-4" />
            </button>
            <button className="p-1 hover:bg-gray-100 rounded">
              <ThumbsUp className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 