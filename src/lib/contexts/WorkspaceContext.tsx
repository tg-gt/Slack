'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getWorkspaces } from '@/lib/firebase/slackUtils';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Workspace } from '@/lib/types/slack';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  loading: boolean;
  error: Error | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      return;
    }

    // Use getWorkspaces instead of direct query
    const loadWorkspaces = async () => {
      try {
        const userWorkspaces = await getWorkspaces(user.uid);
        setWorkspaces(userWorkspaces);
        
        // If no current workspace is selected, select the first one
        if (!currentWorkspace && userWorkspaces.length > 0) {
          setCurrentWorkspace(userWorkspaces[0]);
        }
      } catch (err) {
        console.error('Error fetching workspaces:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [user, currentWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        loading,
        error,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}; 