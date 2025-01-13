'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { DirectMessageChannel } from '@/lib/types/slack';
import { MessageCircle, Users, Info } from 'lucide-react';
import Image from 'next/image';
import { generateInitialsAvatar } from '@/lib/utils/avatarUtils';

interface DirectMessageHeaderProps {
  channel: DirectMessageChannel;
  onInfoClick?: () => void;
  onMembersClick?: () => void;
}

export default function DirectMessageHeader({ channel, onInfoClick, onMembersClick }: DirectMessageHeaderProps) {
  const { user } = useAuth();
  const otherUser = channel.members.find(m => m.id !== user?.uid);

  if (!otherUser) return null;

  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Image
            src={otherUser.avatarUrl || generateInitialsAvatar(otherUser.displayName)}
            alt={otherUser.displayName}
            width={24}
            height={24}
            className="rounded-full"
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-gray-300`} />
        </div>
        <h2 className="font-medium">{otherUser.displayName}</h2>
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