'use client';

import { useState, useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { useMessages } from '@/lib/contexts/MessageContext';
import { uploadFile } from '@/lib/firebase/slackUtils';
import type { Attachment, Message } from '@/lib/types/slack';

interface MessageInputProps {
  channelId: string;
  threadId?: string;
}

export default function MessageInput({ channelId, threadId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { sendMessage } = useMessages();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim() || !currentWorkspace) return;

    try {
      const messageData: Omit<Message, 'id' | 'createdAt' | 'updatedAt'> = {
        content: content.trim(),
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL || undefined,
        channelId,
        workspaceId: currentWorkspace.id,
        attachments,
        mentions: [], // TODO: Parse mentions from content
        isEdited: false,
        isPinned: false,
      };

      // Only add threadId if it exists
      if (threadId) {
        (messageData as any).threadId = threadId;
      }

      await sendMessage(messageData);
      setContent('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace) return;

    setIsUploading(true);
    try {
      const attachment = await uploadFile(file, currentWorkspace.id);
      setAttachments(prev => [...prev, attachment]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!currentWorkspace) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1"
            >
              <span className="text-sm truncate max-w-[200px]">
                {attachment.name}
              </span>
              <button
                type="button"
                onClick={() => setAttachments(prev => 
                  prev.filter(a => a.id !== attachment.id)
                )}
                className="text-gray-500 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
          />
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700"
          disabled={isUploading}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="submit"
          disabled={!content.trim() || isUploading}
          className="p-2 text-blue-500 hover:text-blue-700 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </form>
  );
} 