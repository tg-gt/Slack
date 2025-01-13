'use client';

import { useState, useEffect } from 'react';
import { Hash, Lock, Users, Info, Settings, Pencil, Trash2, X, Check } from 'lucide-react';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { updateChannel, deleteChannel } from '@/lib/firebase/slackUtils';
import type { Channel } from '@/lib/types/slack';

interface MessageHeaderProps {
  channel: Channel;
  onInfoClick?: () => void;
  onMembersClick?: () => void;
  onChannelDeleted?: () => void;
}

export default function MessageHeader({ channel, onInfoClick, onMembersClick, onChannelDeleted }: MessageHeaderProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [channelName, setChannelName] = useState(channel.name);
  const [showSettings, setShowSettings] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isCreator = user?.uid === channel.createdBy;

  useEffect(() => {
    setChannelName(channel.name);
  }, [channel.name]);

  const handleUpdateName = async () => {
    if (!user || !channelName.trim() || channelName === channel.name) {
      setIsEditing(false);
      return;
    }

    try {
      setIsUpdating(true);
      await updateChannel(channel.id, user.uid, { name: channelName.trim() });
      setIsEditing(false);
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating channel name:', error);
      setChannelName(channel.name);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!user || !window.confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
      return;
    }

    try {
      setIsUpdating(true);
      await deleteChannel(channel.id, user.uid);
      setShowSettings(false);
      onChannelDeleted?.();
    } catch (error) {
      console.error('Error deleting channel:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        {channel.isPrivate ? (
          <Lock className="h-4 w-4 text-gray-500" />
        ) : (
          <Hash className="h-4 w-4 text-gray-500" />
        )}
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateName();
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                  setChannelName(channel.name);
                }
              }}
            />
            <button
              onClick={handleUpdateName}
              className="text-blue-500 hover:text-blue-700"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setChannelName(channel.name);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <h2 className="font-medium">{channel.name}</h2>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <button 
          onClick={onMembersClick}
          className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
        >
          <Users className="h-4 w-4" />
          <span className="text-sm">{channel.members.length}</span>
        </button>
        <button 
          onClick={onInfoClick}
          className="text-gray-500 hover:text-gray-700"
        >
          <Info className="h-4 w-4" />
        </button>
        {isCreator && (
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-4 w-4" />
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowSettings(false);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Edit channel name</span>
                  </button>
                  <button
                    onClick={handleDeleteChannel}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete channel</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 