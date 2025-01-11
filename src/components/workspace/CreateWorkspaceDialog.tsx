'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { createWorkspace } from '@/lib/firebase/slackUtils';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import type { Workspace } from '@/lib/types/slack';

interface CreateWorkspaceDialogProps {
  onClose: () => void;
}

export default function CreateWorkspaceDialog({ onClose }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { user } = useAuth();
  const { setCurrentWorkspace } = useWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsLoading(true);
    setError(undefined);

    try {
      console.log('Creating workspace with data:', { name, userId: user.uid });

      const workspaceData = {
        name: name.trim(),
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        ownerId: user.uid,
        members: [{
          userId: user.uid,
          role: 'owner' as const,
          joinedAt: new Date().toISOString(),
        }],
      };

      const workspaceRef = await createWorkspace(workspaceData);
      console.log('Workspace created with ID:', workspaceRef.id);

      // Create a workspace object with the new ID
      const newWorkspace: Workspace = {
        id: workspaceRef.id,
        ...workspaceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCurrentWorkspace(newWorkspace);
      onClose();
    } catch (err: any) {
      console.error('Detailed error creating workspace:', err);
      setError(err?.message || 'Failed to create workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create a new workspace</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Workspace name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g. My Team"
                required
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 