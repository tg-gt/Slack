'use client';

import { Hash, Lock, Users, Info } from 'lucide-react';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import type { Channel } from '@/lib/types/slack';

interface MessageHeaderProps {
  channel: Channel;
  onInfoClick?: () => void;
  onMembersClick?: () => void;
}

export default function MessageHeader({ channel, onInfoClick, onMembersClick }: MessageHeaderProps) {
  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        {channel.isPrivate ? (
          <Lock className="h-4 w-4 text-gray-500" />
        ) : (
          <Hash className="h-4 w-4 text-gray-500" />
        )}
        <h2 className="font-medium">{channel.name}</h2>
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
      </div>
    </div>
  );
} 