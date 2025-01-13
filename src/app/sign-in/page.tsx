'use client';

import { useState } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { createInitialProfile } from '@/lib/firebase/slackUtils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { generateInitialsAvatar } from '@/lib/utils/avatarUtils';

export default function SignIn() {
  const { user, loading, signInWithEmail, createAccountWithEmail } = useAuth();
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
        }
      });
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(undefined);

    try {
      // Try to sign in first
      await signInWithEmail(email, password);
    } catch (err: any) {
      // If sign in fails, try to create account
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          await createAccountWithEmail(email, password);
          await createInitialProfile({
            id: auth.currentUser!.uid,
            email: email,
            displayName: email.split('@')[0],
            avatarUrl: generateInitialsAvatar(email),
            preferences: {
              theme: 'light',
              notifications: {
                desktop: true,
                mobile: true,
                email: true,
                mentionsOnly: false,
              },
            }
          });
        } catch (createErr: any) {
          console.error('Error creating account:', createErr);
          if (createErr.code === 'auth/email-already-in-use') {
            setError('Incorrect password. Please try again.');
          } else {
            setError(createErr.message || 'Failed to create account. Please try again.');
          }
        }
      } else {
        console.error('Error signing in:', err);
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleEmailAuth}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isProcessing}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <LoadingSpinner className="h-5 w-5" />
              ) : (
                'Continue with email'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isProcessing}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 