'use client';

import { useState, useEffect } from 'react';
import { Hash, Lock, ChevronDown, Plus } from 'lucide-react';
import { getChannels } from '@/lib/firebase/slackUtils';
import type { Channel } from '@/lib/types/slack';
import { useAuth } from '@/lib/hooks/useAuth';
import CreateChannelDialog from './CreateChannelDialog';

interface ChannelListProps {
  workspaceId: string;
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export default function ChannelList({ 
  workspaceId, 
  selectedChannelId,
  onChannelSelect 
}: ChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadChannels = async () => {
      if (workspaceId && user?.uid) {
        const channelList = await getChannels(workspaceId, user.uid);
        setChannels(channelList);
      }
    };
    loadChannels();
  }, [workspaceId, user?.uid]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
           onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-2">
          <ChevronDown className={`h-4 w-4 transform transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
          <span className="font-medium">Channels</span>
        </div>
        {user && (
          <Plus 
            className="h-4 w-4 hover:text-blue-500" 
            onClick={(e) => {
              e.stopPropagation();
              setShowCreateDialog(true);
            }}
          />
        )}
      </div>

      {isExpanded && (
        <div className="space-y-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={`w-full flex items-center px-4 py-1.5 text-sm hover:bg-gray-100 ${
                selectedChannelId === channel.id ? 'bg-blue-100' : ''
              }`}
            >
              {channel.isPrivate ? (
                <Lock className="h-4 w-4 mr-2 text-gray-500" />
              ) : (
                <Hash className="h-4 w-4 mr-2 text-gray-500" />
              )}
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <CreateChannelDialog
          workspaceId={workspaceId}
          onClose={() => setShowCreateDialog(false)}
          onChannelCreated={(channel) => {
            setChannels([...channels, channel]);
            setShowCreateDialog(false);
          }}
        />
      )}
    </div>
  );
} 