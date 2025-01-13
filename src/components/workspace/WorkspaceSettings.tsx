'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { updateWorkspace, deleteWorkspace } from '@/lib/firebase/slackUtils';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useRouter } from 'next/navigation';

interface WorkspaceSettingsProps {
  onClose: () => void;
}

export default function WorkspaceSettings({ onClose }: WorkspaceSettingsProps) {
  const { user } = useAuth();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspace();
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  if (!currentWorkspace || !user) return null;

  const isOwner = currentWorkspace.ownerId === user.uid;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !name.trim()) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const updatedWorkspace = await updateWorkspace(currentWorkspace.id, user.uid, {
        name: name.trim()
      });
      setCurrentWorkspace(updatedWorkspace);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;

    setIsLoading(true);
    setError(undefined);

    try {
      await deleteWorkspace(currentWorkspace.id, user.uid);
      setCurrentWorkspace(null);
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || 'Failed to delete workspace');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Workspace Settings</h2>
        
        {!isOwner ? (
          <p className="text-gray-600">Only workspace owners can modify these settings.</p>
        ) : (
          <form onSubmit={handleUpdate}>
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

              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md mb-3"
                  disabled={isLoading}
                >
                  Delete Workspace
                </button>
              </div>
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
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-red-600 mb-2">Delete Workspace?</h3>
              <p className="text-gray-600 mb-4">
                This will permanently delete the workspace and all its data. This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 