'use client';

import './globals.css';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePathname, redirect } from 'next/navigation';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { WorkspaceProvider } from '@/lib/contexts/WorkspaceContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RAGListener from '@/components/rag/RAGListener';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (!user && pathname !== '/sign-in') {
    redirect('/sign-in');
  }

  if (user && pathname === '/sign-in') {
    redirect('/');
  }

  return (
    <>
      {user && <RAGListener />}
      {children}
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }} data-force-color-scheme="light">
      <body style={{ colorScheme: 'light', backgroundColor: 'white', color: 'black' }}>
        <AuthProvider>
          <WorkspaceProvider>
            <AuthWrapper>{children}</AuthWrapper>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
