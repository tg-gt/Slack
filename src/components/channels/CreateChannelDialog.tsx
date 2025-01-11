'use client';

import { useState } from 'react';
import { createChannel } from '@/lib/firebase/slackUtils';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Channel } from '@/lib/types/slack';

interface CreateChannelDialogProps {
  workspaceId: string;
  onClose: () => void;
  onChannelCreated: (channel: Channel) => void;
}

export default function CreateChannelDialog({ 
  workspaceId, 
  onClose, 
  onChannelCreated 
}: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const channelData = {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        workspaceId,
        isPrivate,
        createdBy: user.uid,
        members: [user.uid],
      };

      const channelRef = await createChannel(channelData);
      onChannelCreated({ id: channelRef.id, ...channelData } as Channel);
    } catch (error) {
      console.error('Error creating channel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create a channel</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Channel name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g. project-updates"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="What's this channel about?"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Make private
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 