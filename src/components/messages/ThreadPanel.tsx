'use client';

import React, { useState } from 'react';
import { Message } from '@/lib/types/slack';
import ThreadHeader from './ThreadHeader';
import ThreadMessageList from './ThreadMessageList';
import ThreadComposer from './ThreadComposer';
import { MessageProvider } from '@/lib/contexts/MessageContext';

interface ThreadPanelProps {
  parentMessage: Message;
  onClose: () => void;
}

export default function ThreadPanel({ parentMessage, onClose }: ThreadPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 w-full sm:w-96 h-full bg-white border-l shadow-xl z-50">
      <MessageProvider channelId={parentMessage.channelId}>
        <div className="flex flex-col h-full">
          <ThreadHeader parentMessage={parentMessage} onClose={handleClose} />
          <div className="flex-1 overflow-y-auto">
            <ThreadMessageList parentMessage={parentMessage} />
          </div>
          <div className="border-t p-2">
            <ThreadComposer parentMessage={parentMessage} />
          </div>
        </div>
      </MessageProvider>
    </div>
  );
}