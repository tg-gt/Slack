'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import type { Message } from '../types/slack';
import { useAuth } from '../hooks/useAuth';

interface MessageContextType {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  sendMessage: (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ 
  children, 
  channelId 
}: { 
  children: React.ReactNode;
  channelId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('channelId', '==', channelId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setMessages(
          snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))
        );
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [channelId]);

  const sendMessage = async (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'messages'), {
        ...message,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error as Error);
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