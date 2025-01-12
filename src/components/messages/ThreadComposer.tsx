'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMessages } from '@/lib/contexts/MessageContext';
import { Message } from '@/lib/types/slack';
import { generateInitialsAvatar } from '@/lib/utils/avatarUtils';

interface ThreadComposerProps {
  parentMessage: Message;
}

export default function ThreadComposer({ parentMessage }: ThreadComposerProps) {
  const [content, setContent] = useState('');
  const { user } = useAuth();
  const { sendReplyMessage } = useMessages();

  const handleSendReply = async () => {
    if (!content.trim() || !user) return;

    try {
      await sendReplyMessage(parentMessage.id, {
        content: content.trim(),
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL || generateInitialsAvatar(user.displayName || 'Anonymous'),
        channelId: parentMessage.channelId,
        workspaceId: parentMessage.workspaceId,
        attachments: [],
        mentions: [],
        reactions: [],
        isEdited: false,
        isPinned: false
      });
      setContent('');
    } catch (error) {
      console.error('Error sending thread reply:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="flex items-start space-x-2">
      <textarea
        className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={1}
        placeholder="Reply to thread..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        onClick={handleSendReply}
        className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
      >
        Send
      </button>
    </div>
  );
}