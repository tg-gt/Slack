'use client';

import { useState, useEffect } from 'react';
import { Hash, Lock, ChevronDown, Plus, UserPlus, Search, Check } from 'lucide-react';
import { getChannels, inviteToChannel, searchUsers } from '@/lib/firebase/slackUtils';
import type { Channel, UserProfile } from '@/lib/types/slack';
import { useAuth } from '@/lib/hooks/useAuth';
import CreateChannelDialog from './CreateChannelDialog';
import { useDebounce } from '@/lib/hooks/useDebounce';

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
  const [showInviteDialog, setShowInviteDialog] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { user } = useAuth();
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const loadChannels = async () => {
      if (workspaceId && user?.uid) {
        const channelList = await getChannels(workspaceId, user.uid);
        setChannels(channelList);
      }
    };
    loadChannels();
  }, [workspaceId, user?.uid]);

  useEffect(() => {
    const searchForUsers = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchUsers(debouncedSearch);
        // Filter out current user and already selected users
        const filteredResults = results.filter(result => 
          result.id !== user?.uid && 
          !selectedUsers.some(selected => selected.id === result.id)
        );
        setSearchResults(filteredResults);
        setError(undefined);
      } catch (err) {
        console.error('Error searching users:', err);
        setError('Failed to search users');
      } finally {
        setIsLoading(false);
      }
    };

    searchForUsers();
  }, [debouncedSearch, user?.uid, selectedUsers]);

  const handleInvite = async (channelId: string) => {
    if (selectedUsers.length === 0) return;
    
    try {
      await inviteToChannel(channelId, selectedUsers.map(u => u.id));
      setShowInviteDialog(null);
      setSelectedUsers([]);
      setSearchQuery('');
      setError(undefined);
    } catch (err) {
      setError('Failed to invite users. Please try again.');
    }
  };

  const toggleUserSelection = (user: UserProfile) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
    setSearchQuery(''); // Clear search after selection
  };

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
            <div
              key={channel.id}
              className={`group flex items-center justify-between px-4 py-1.5 hover:bg-gray-100 ${
                selectedChannelId === channel.id ? 'bg-blue-100' : ''
              }`}
            >
              <button
                onClick={() => onChannelSelect(channel.id)}
                className="flex items-center flex-1"
              >
                {channel.isPrivate ? (
                  <Lock className="h-4 w-4 mr-2 text-gray-500" />
                ) : (
                  <Hash className="h-4 w-4 mr-2 text-gray-500" />
                )}
                <span className="truncate text-sm">{channel.name}</span>
              </button>
              {channel.isPrivate && channel.createdBy === user?.uid && (
                <UserPlus
                  className="h-4 w-4 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 cursor-pointer"
                  onClick={() => setShowInviteDialog(channel.id)}
                />
              )}
            </div>
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

      {showInviteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Invite to Channel</h3>
            <div className="space-y-4">
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                    >
                      <span>{user.displayName}</span>
                      <button
                        onClick={() => toggleUserSelection(user)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {isLoading && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => toggleUserSelection(result)}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-left"
                    >
                      <span className="text-sm">{result.displayName}</span>
                      <Check className={`h-4 w-4 ${
                        selectedUsers.some(u => u.id === result.id)
                          ? 'text-blue-500'
                          : 'text-transparent'
                      }`} />
                    </button>
                  ))}
                </div>
              )}
              
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInviteDialog(null);
                    setSelectedUsers([]);
                    setSearchQuery('');
                    setError(undefined);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleInvite(showInviteDialog)}
                  disabled={selectedUsers.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Invite Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 