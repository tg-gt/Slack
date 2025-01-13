'use client';

import { useState } from 'react';
import { Menu, Search, Settings } from 'lucide-react';
import WorkspaceNav from '../workspace/WorkspaceNav';
import ChannelList from '../channels/ChannelList';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
import { MessageProvider } from '@/lib/contexts/MessageContext';
import MessageThread from '../messages/MessageThread';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAuth } from '@/lib/hooks/useAuth';
import WorkspaceSettings from '../workspace/WorkspaceSettings';

export default function MainLayout() {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const [selectedChannelId, setSelectedChannelId] = useState<string>();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  if (authLoading || workspaceLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return null; // Middleware will redirect to sign-in
  }

  return (
    <div className="flex h-screen">
      <div className={`${showMobileMenu ? 'block' : 'hidden'} md:block md:relative fixed inset-y-0 left-0 z-30`}>
        <WorkspaceNav />
      </div>

      <div className={`${showMobileMenu ? 'block' : 'hidden'} md:block w-64 bg-gray-100 border-r overflow-y-auto`}>
        {currentWorkspace && (
          <div>
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <h1 className="text-xl font-bold truncate">
                    {currentWorkspace.name}
                  </h1>
                  <button 
                    onClick={() => setShowSettingsDialog(true)}
                    className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-700"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-md"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search messages..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <ChannelList
              workspaceId={currentWorkspace.id}
              selectedChannelId={selectedChannelId}
              onChannelSelect={(channelId) => {
                setSelectedChannelId(channelId);
                setShowMobileMenu(false);
              }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="md:hidden p-4 border-b">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {selectedChannelId ? (
          <MessageProvider channelId={selectedChannelId}>
            <MessageThread channelId={selectedChannelId} />
          </MessageProvider>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a channel or direct message to start chatting
          </div>
        )}
      </div>

      {showSettingsDialog && currentWorkspace && (
        <WorkspaceSettings onClose={() => setShowSettingsDialog(false)} />
      )}
    </div>
  );
} 