'use client';

import { useState, useEffect, useRef } from 'react';
import { useMessages } from '@/lib/contexts/MessageContext';
import { useAuth } from '@/lib/hooks/useAuth';
import MessageInput from './MessageInput';
import MessageItem from './MessageItem';
import { Loader2 } from 'lucide-react';
import MessageHeader from './MessageHeader';
import { getChannel } from '@/lib/firebase/slackUtils';
import type { Channel } from '@/lib/types/slack';

interface MessageThreadProps {
  channelId: string;
  threadId?: string;
}

export default function MessageThread({ channelId, threadId }: MessageThreadProps) {
  const { messages, loading, error } = useMessages();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const loadChannel = async () => {
      try {
        const channelData = await getChannel(channelId);
        setChannel(channelData);
      } catch (error) {
        console.error('Error loading channel:', error);
      }
    };
    loadChannel();
  }, [channelId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    const messageContainer = messagesEndRef.current?.parentElement;
    messageContainer?.addEventListener('scroll', handleScroll);

    return () => messageContainer?.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [loading, messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error loading messages: {error.message}
      </div>
    );
  }

  const threadMessages = threadId
    ? messages.filter(m => m.threadId === threadId)
    : messages.filter(m => !m.threadId);

  return (
    <div className="flex flex-col h-full">
      {channel && <MessageHeader channel={channel} />}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {threadMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwnMessage={message.userId === user?.uid}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-4 bg-blue-500 text-white rounded-full p-2 shadow-lg"
        >
          ↓
        </button>
      )}

      <MessageInput
        channelId={channelId}
        threadId={threadId}
      />
    </div>
  );
} 