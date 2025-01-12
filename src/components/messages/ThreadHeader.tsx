'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Message } from '@/lib/types/slack';
import { format } from 'date-fns';

interface ThreadHeaderProps {
  parentMessage: Message;
  onClose: () => void;
}

export default function ThreadHeader({ parentMessage, onClose }: ThreadHeaderProps) {
  return (
    <div className="p-4 border-b flex items-center justify-between">
      <div className="space-y-1">
        <div className="text-sm font-semibold">
          {parentMessage.userName} 
          <span className="ml-2 text-xs text-gray-500">
            {format(new Date(parentMessage.createdAt), 'h:mm a')}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {parentMessage.content}
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-800 p-2"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}