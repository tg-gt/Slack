'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc
} from 'firebase/firestore';
import type { Message } from '../types/slack';
import { useAuth } from '../hooks/useAuth';

interface MessageContextType {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  sendMessage: (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

/**
 * Accept either channelId or dmChannelId to fetch messages.
 */
const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({
  children,
  channelId,
  dmChannelId
}: {
  children: React.ReactNode;
  channelId?: string;
  dmChannelId?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    setError(null);

    // If no channelId or dmChannelId, do nothing.
    if (!channelId && !dmChannelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let q;
    if (channelId) {
      // normal channel
      q = query(
        collection(db, 'messages'),
        where('channelId', '==', channelId),
        orderBy('createdAt', 'asc')
      );
    } else {
      // direct message channel
      q = query(
        collection(db, 'messages'),
        where('dmChannelId', '==', dmChannelId),
        orderBy('createdAt', 'asc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(fetched);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [channelId, dmChannelId]);

  const sendMessage = async (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'messages'), {
        ...message,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err as Error);
    }
  };

  return (
    <MessageContext.Provider value={{ messages, loading, error, sendMessage }}>
      {children}
    </MessageContext.Provider>
  );
}

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};