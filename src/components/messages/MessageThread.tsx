'use client';

import { useState, useEffect, useRef } from 'react';
import { useMessages } from '@/lib/contexts/MessageContext';
import { useAuth } from '@/lib/hooks/useAuth';
import MessageInput from './MessageInput';
import MessageItem from './MessageItem';
import { Loader2 } from 'lucide-react';
import MessageHeader from './MessageHeader';
import DirectMessageHeader from './DirectMessageHeader';
import { getChannel, getDirectMessageChannel } from '@/lib/firebase/slackUtils';
import type { Channel, DirectMessageChannel } from '@/lib/types/slack';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

interface MessageThreadProps {
  channelId: string;
  threadId?: string;
}

export default function MessageThread({ channelId, threadId }: MessageThreadProps) {
  const { messages, loading, error } = useMessages();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [channel, setChannel] = useState<Channel | DirectMessageChannel | null>(null);
  const [isDM, setIsDM] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadChannel = async () => {
      try {
        // First try to load as DM channel
        const dmChannel = await getDirectMessageChannel(channelId);
        if (dmChannel) {
          setChannel(dmChannel);
          setIsDM(true);
          return;
        }

        // If not a DM, load as regular channel
        const channelData = await getChannel(channelId);
        setChannel(channelData);
        setIsDM(false);

        // Set up real-time listener for channel updates
        const unsubscribe = onSnapshot(doc(db, 'channels', channelId), (doc) => {
          if (doc.exists()) {
            setChannel({ id: doc.id, ...doc.data() } as Channel);
          } else {
            // Channel was deleted, clear state but let the component handle the redirect
            setChannel(null);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading channel:', error);
        setChannel(null);
      }
    };
    loadChannel();
  }, [channelId]);

  // Handle channel deletion by redirecting when channel becomes null
  useEffect(() => {
    if (channel === null && !isDM) {
      router.push('/');
    }
  }, [channel, isDM, router]);

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

  const handleInfoClick = () => {
    setShowInfoPanel(true);
  };

  const handleMembersClick = () => {
    setShowMembersPanel(true);
  };

  const handleChannelDeleted = () => {
    // Clear the channel state and redirect
    setChannel(null);
    router.push('/');
  };

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
      {channel && (
        isDM ? (
          <DirectMessageHeader 
            channel={channel as DirectMessageChannel} 
            onInfoClick={handleInfoClick}
            onMembersClick={handleMembersClick}
          />
        ) : (
          <MessageHeader 
            channel={channel as Channel} 
            onInfoClick={handleInfoClick}
            onMembersClick={handleMembersClick}
            onChannelDeleted={handleChannelDeleted}
          />
        )
      )}
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

      {/* TODO: Add InfoPanel component when showInfoPanel is true */}
      {/* TODO: Add MembersPanel component when showMembersPanel is true */}
    </div>
  );
} 