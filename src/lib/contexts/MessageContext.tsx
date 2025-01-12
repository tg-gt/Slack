'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import type { Message } from '../types/slack';
import { useAuth } from '../hooks/useAuth';

interface MessageContextType {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  sendMessage: (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  sendReplyMessage: (
    threadParentId: string,
    message: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'threadId' | 'isThreadParent'>
  ) => Promise<void>;
}

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

    if (!channelId && !dmChannelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let q;
    if (channelId) {
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

  const sendMessage = async (
    message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
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

  // For replying in a thread, we set threadId and update parent message's thread info
  const sendReplyMessage = async (
    threadParentId: string,
    message: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'threadId' | 'isThreadParent'>
  ) => {
    try {
      const now = new Date().toISOString();
      // Insert the new reply
      const docRef = await addDoc(collection(db, 'messages'), {
        ...message,
        threadId: threadParentId,
        createdAt: now,
        updatedAt: now,
      });

      // Update the parent message with new threadCount, lastReplyAt, isThreadParent
      const parentRef = doc(db, 'messages', threadParentId);
      const parentSnap = await getDoc(parentRef);
      if (parentSnap.exists()) {
        const parentData = parentSnap.data() as Message;
        const newCount = (parentData.threadCount || 0) + 1;
        await updateDoc(parentRef, {
          threadCount: newCount,
          lastReplyAt: now,
          isThreadParent: true
        });
      }
    } catch (err) {
      console.error('Error sending thread reply:', err);
      setError(err as Error);
    }
  };

  return (
    <MessageContext.Provider value={{ messages, loading, error, sendMessage, sendReplyMessage }}>
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