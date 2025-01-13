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
import ReactionPicker from './ReactionPicker';
import MessageReactions from './MessageReactions';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const [showThreadPanel, setShowThreadPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
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

  const handleReactionClick = (emoji: string) => {
    // This will be handled by the ReactionPicker component
  };

  return (
    <div
      className="group relative flex items-start space-x-3 py-2 hover:bg-gray-50"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex-shrink-0">
        <Image
          src={message.userAvatar || '/default-avatar.png'}
          alt={message.userName}
          width={40}
          height={40}
          className="rounded-full"
        />
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-center">
          <span className="font-medium">{message.userName}</span>
          <span className="ml-2 text-sm text-gray-500">
            {format(new Date(message.createdAt), 'h:mm a')}
          </span>
          {message.isEdited && (
            <span className="ml-2 text-xs text-gray-500">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <div className="mt-2 space-x-2">
              <button
                onClick={handleEdit}
                className="text-sm text-white bg-blue-500 px-2 py-1 rounded hover:bg-blue-600"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-900">
              {message.content}
            </p>
            {message.attachments?.length > 0 && (
              <div className="mt-2">
                {message.attachments.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <MessageReactions 
          reactions={Array.isArray(message.reactions) ? message.reactions : []} 
          messageId={message.id}
          channelId={message.channelId}
          workspaceId={message.workspaceId}
        />

        {/* Hover Actions Menu */}
        {showActions && !isEditing && (
          <div className="absolute right-0 top-0 flex items-center space-x-2 bg-white shadow-sm rounded-md p-1">
            {!message.threadId && (
              <button
                onClick={() => setShowThreadPanel(!showThreadPanel)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}
            
            <div className="relative">
              <ReactionPicker
                messageId={message.id}
                channelId={message.channelId}
                workspaceId={message.workspaceId}
                reactions={Array.isArray(message.reactions) ? message.reactions : []}
              />
            </div>

            {isOwnMessage && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}

        {showThreadPanel && (
          <ThreadPanel
            parentMessage={message}
            onClose={() => setShowThreadPanel(false)}
          />
        )}
      </div>
    </div>
  );
}