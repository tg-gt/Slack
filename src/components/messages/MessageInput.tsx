'use client';

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { useMessages } from '@/lib/contexts/MessageContext';
import { uploadFile, getProfile } from '@/lib/firebase/slackUtils';
import { generateInitialsAvatar } from '@/lib/utils/avatarUtils';
import type { Attachment, Message, UserProfile } from '@/lib/types/slack';

interface MessageInputProps {
  channelId: string;
  threadId?: string;
}

export default function MessageInput({ channelId, threadId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { sendMessage } = useMessages();
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.uid) {
        const profile = await getProfile(user.uid);
        setUserProfile(profile);
      }
    };
    loadProfile();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim() || !currentWorkspace || !userProfile) return;

    try {
      const userName = userProfile.displayName || user.displayName || 'Anonymous';
      const messageData: Omit<Message, 'id' | 'createdAt' | 'updatedAt'> = {
        content: content.trim(),
        userId: user.uid,
        userName,
        userAvatar: userProfile.avatarUrl || user.photoURL || generateInitialsAvatar(userName),
        channelId,
        workspaceId: currentWorkspace.id,
        attachments,
        mentions: [], // TODO: Parse mentions from content
        reactions: [],
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
    const files = e.target.files;
    if (!files || !currentWorkspace || !user) return;

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const uploadPromises = Array.from(files).map(file => 
        uploadFile(file, currentWorkspace.id, channelId, user.uid)
      );
      const newAttachments = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...newAttachments]);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      setUploadError(error.message || 'Failed to upload file(s)');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!currentWorkspace) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 border-t">
      {uploadError && (
        <div className="text-red-500 text-sm mb-2">
          {uploadError}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
              <span className="text-sm truncate max-w-[200px]">{attachment.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          disabled={isUploading}
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 resize-none rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={1}
        />
        <button
          type="submit"
          disabled={!content.trim() && attachments.length === 0}
          className="p-2 text-blue-500 hover:text-blue-700 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
} 