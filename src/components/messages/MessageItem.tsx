'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { MessageCircle, ThumbsUp, Pencil, Trash2, X, Check } from 'lucide-react';
import type { Message } from '@/lib/types/slack';
import { useAuth } from '@/lib/hooks/useAuth';
import AttachmentPreview from '../attachments/AttachmentPreview';
import ThreadPanel from './ThreadPanel';
import { editMessage, deleteMessage } from '@/lib/firebase/slackUtils';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const [showThreadPanel, setShowThreadPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const { user } = useAuth();

  const handleEdit = async () => {
    try {
      await editMessage(message.id, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(message.id);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  return (
    <div
      className="group relative flex items-start space-x-3 py-2 hover:bg-gray-50"
      onMouseEnter={() => {}}
      onMouseLeave={() => {}}
    >
      <div className="flex-shrink-0">
        <Image
          src={message.userAvatar || '/default-avatar.png'}
          alt={message.userName || 'User'}
          width={40}
          height={40}
          className="rounded-full"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{message.userName}</span>
          <span className="text-xs text-gray-500">
            {format(new Date(message.createdAt), 'h:mm a')}
          </span>
          {message.isEdited && (
            <span className="text-xs text-gray-500">(edited)</span>
          )}
          {isOwnMessage && !isEditing && (
            <div className="hidden group-hover:flex items-center space-x-2 ml-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Trash2 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 flex items-center space-x-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <div className="flex flex-col space-y-2">
              <button
                onClick={handleEdit}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Check className="w-4 h-4 text-green-500" />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(message.content);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</p>
        )}

        {message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        <div className="absolute right-0 top-0 flex items-center space-x-2 bg-white shadow-sm rounded-md p-1">
          {!message.threadId && (
            <button className="p-1 hover:bg-gray-100 rounded">
              <MessageCircle
                className="h-4 w-4"
                onClick={() => setShowThreadPanel(true)}
              />
            </button>
          )}
          <button className="p-1 hover:bg-gray-100 rounded">
            <ThumbsUp className="h-4 w-4" />
          </button>
        </div>

        {!message.threadId && message.isThreadParent && message.threadCount ? (
          <div className="mt-2">
            <button
              onClick={() => setShowThreadPanel(true)}
              className="text-blue-500 hover:underline text-sm"
            >
              {message.threadCount === 1
                ? '1 reply'
                : `${message.threadCount} replies`}
            </button>
          </div>
        ) : null}
      </div>

      {showThreadPanel && !message.threadId && (
        <ThreadPanel
          parentMessage={message}
          onClose={() => setShowThreadPanel(false)}
        />
      )}
    </div>
  );
}