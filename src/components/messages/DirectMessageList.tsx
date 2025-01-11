'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Plus, Search, Check } from 'lucide-react';
import { 
  getDirectMessageChannels, 
  searchUsers, 
  createDirectMessageChannel,
  getUserProfile 
} from '@/lib/firebase/slackUtils';
import type { DirectMessageChannel, UserProfile } from '@/lib/types/slack';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Image from 'next/image';
import { generateInitialsAvatar } from '@/lib/utils/avatarUtils';

interface DirectMessageListProps {
  workspaceId: string;
  selectedChannelId?: string;
  onSelectDM: (channelId: string) => void;
}

export default function DirectMessageList({ 
  workspaceId, 
  selectedChannelId,
  onSelectDM 
}: DirectMessageListProps) {
  const [dmChannels, setDmChannels] = useState<DirectMessageChannel[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { user } = useAuth();
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const loadDMChannels = async () => {
      if (workspaceId && user?.uid) {
        console.log('Loading DM channels for:', { workspaceId, userId: user.uid });
        try {
          const channels = await getDirectMessageChannels(workspaceId, user.uid);
          console.log('Loaded DM channels:', channels);
          setDmChannels(channels);
        } catch (err) {
          console.error('Error loading DM channels:', err);
          setError('Failed to load direct messages');
        }
      }
    };
    loadDMChannels();
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
        const filteredResults = results.filter(result => 
          result.id !== user?.uid && 
          !dmChannels.some(channel => 
            channel.memberIds.includes(result.id)
          )
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
  }, [debouncedSearch, user?.uid, dmChannels]);

  const handleCreateDM = async () => {
    if (!selectedUser || !user) return;
    
    try {
      const currentUserProfile = await getUserProfile(user.uid);
      if (!currentUserProfile) {
        throw new Error('Failed to get current user profile');
      }

      const channelRef = await createDirectMessageChannel(workspaceId, [
        currentUserProfile,
        selectedUser
      ]);
      
      // Refresh DM channels
      const channels = await getDirectMessageChannels(workspaceId, user.uid);
      setDmChannels(channels);
      
      // Select the new DM channel
      onSelectDM(channelRef.id);
      
      // Reset state
      setShowCreateDialog(false);
      setSelectedUser(null);
      setSearchQuery('');
      setError(undefined);
    } catch (err) {
      console.error('Error creating DM:', err);
      setError('Failed to create direct message. Please try again.');
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium">Direct Messages</span>
        </div>
        {user && (
          <Plus
            className="h-4 w-4 text-gray-400 hover:text-blue-500 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowCreateDialog(true);
            }}
          />
        )}
      </div>

      {isExpanded && (
        <div className="space-y-1">
          {dmChannels.length > 0 ? (
            dmChannels.map((channel) => {
              console.log('Rendering DM channel:', channel);
              const otherUser = channel.members.find(m => m.id !== user?.uid);
              if (!otherUser) {
                console.log('No other user found in channel:', channel);
                return null;
              }

              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectDM(channel.id)}
                  className={`w-full flex items-center px-4 py-1.5 hover:bg-gray-100 ${
                    selectedChannelId === channel.id ? 'bg-blue-100' : ''
                  }`}
                >
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
                    <span className="text-sm truncate">{otherUser.displayName}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              No direct messages yet
            </div>
          )}
        </div>
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Start a Direct Message</h3>
            <div className="space-y-4">
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
                      onClick={() => setSelectedUser(result)}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <Image
                          src={result.avatarUrl || '/default-avatar.png'}
                          alt={result.displayName}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <span className="text-sm">{result.displayName}</span>
                      </div>
                      <Check
                        className={`h-4 w-4 ${
                          selectedUser?.id === result.id
                            ? 'text-blue-500'
                            : 'text-transparent'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
              
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setSelectedUser(null);
                    setSearchQuery('');
                    setError(undefined);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDM}
                  disabled={!selectedUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}