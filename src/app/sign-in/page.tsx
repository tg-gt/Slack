'use client';

import { useState } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { createInitialProfile } from '@/lib/firebase/slackUtils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function SignIn() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (user) {
    redirect('/');
    return null;
  }

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    setError(undefined);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      console.log('Sign in successful:', result.user.email);
      
      // Create initial profile for new users
      await createInitialProfile({
        id: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || '',
        avatarUrl: result.user.photoURL || undefined,
        preferences: {
          theme: 'light',
          notifications: {
            desktop: true,
            mobile: true,
            email: true,
            mentionsOnly: false,
          },
        },
      });

      redirect('/');
    } catch (error: any) {
      console.error('Detailed sign-in error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else {
        setError(`Failed to sign in: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Slack Clone
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in or create an account to get started
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isProcessing}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <LoadingSpinner className="h-5 w-5 mr-2" />
          ) : (
            <img
              className="h-5 w-5 mr-2"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
            />
          )}
          {isProcessing ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
} 