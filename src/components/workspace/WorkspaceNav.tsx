'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, LogOut } from 'lucide-react';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { useAuth } from '@/lib/hooks/useAuth';
import CreateWorkspaceDialog from './CreateWorkspaceDialog';
import LoadingSpinner from '../ui/LoadingSpinner';
import { logoutUser } from '@/lib/firebase/firebaseUtils';
import ProfileSettings from '../user/ProfileSettings';

export default function WorkspaceNav() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, loading } = useWorkspace();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-16 bg-gray-900 h-screen flex flex-col items-center py-4">
        <LoadingSpinner className="h-8 w-8 text-white" />
      </div>
    );
  }

  return (
    <div className="w-16 bg-gray-900 h-screen flex flex-col items-center py-4">
      {workspaces.map((workspace) => (
        <button
          key={workspace.id}
          onClick={() => setCurrentWorkspace(workspace)}
          className={`w-10 h-10 rounded-lg mb-4 relative group ${
            currentWorkspace?.id === workspace.id
              ? 'ring-2 ring-blue-500'
              : 'hover:opacity-80'
          }`}
        >
          <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-medium text-lg">
              {workspace.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
            <span className="text-white text-xs px-2 text-center">
              {workspace.name}
            </span>
          </div>
        </button>
      ))}

      {user && (
        <>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center mb-4"
          >
            <Plus className="w-5 h-5 text-gray-300" />
          </button>

          <div className="mt-auto flex flex-col space-y-4">
            <button
              onClick={() => setShowProfileSettings(true)}
              className="w-10 h-10 rounded-lg overflow-hidden group relative"
            >
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-300">
                  {user.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
                <span className="text-white text-xs px-2 text-center">
                  Profile
                </span>
              </div>
            </button>

            <button 
              onClick={handleSignOut}
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
            >
              <LogOut className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </>
      )}

      {showCreateDialog && (
        <CreateWorkspaceDialog onClose={() => setShowCreateDialog(false)} />
      )}

      {showProfileSettings && (
        <ProfileSettings
          isOpen={showProfileSettings}
          onClose={() => setShowProfileSettings(false)}
        />
      )}
    </div>
  );
} 