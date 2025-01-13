'use client';

import React from 'react';
import { Message } from '@/lib/types/slack';
import MessageItem from './MessageItem';
import { useMessages } from '@/lib/contexts/MessageContext';
import { useAuth } from '@/lib/hooks/useAuth';

interface ThreadMessageListProps {
  parentMessage: Message;
}

export default function ThreadMessageList({ parentMessage }: ThreadMessageListProps) {
  const { messages, loading } = useMessages();
  const { user } = useAuth();
  
  // Filter messages to only show replies to this thread
  const threadReplies = messages.filter(m => m.threadId === parentMessage.id);

  return (
    <div className="p-4 space-y-4">
      <MessageItem 
        key={parentMessage.id} 
        message={parentMessage} 
        isOwnMessage={user?.uid === parentMessage.userId} 
      />
      {threadReplies.map(reply => (
        <div key={reply.id} className="ml-8">
          <MessageItem 
            message={reply} 
            isOwnMessage={user?.uid === reply.userId} 
          />
        </div>
      ))}
      {loading && threadReplies.length === 0 && (
        <div className="ml-8 p-2 text-sm text-gray-600">
          Loading replies...
        </div>
      )}
      {!loading && threadReplies.length === 0 && (
        <div className="ml-8 p-2 text-sm text-gray-600">
          No replies yet. Be the first to reply!
        </div>
      )}
    </div>
  );
}