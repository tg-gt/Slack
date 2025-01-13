'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { updateProfile } from '@/lib/firebase/slackUtils';
import type { UserProfile } from '@/lib/types/slack';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function UserProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      // TODO: Implement getProfile in slackUtils
      setLoading(false);
    };
    loadProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    try {
      await updateProfile(user.uid, profile);
      // Show success message
    } catch (error) {
      console.error('Error updating profile:', error);
      // Show error message
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Display Name
        </label>
        <input
          type="text"
          value={profile?.displayName || ''}
          onChange={(e) => setProfile(p => ({ ...p!, displayName: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <input
          type="text"
          value={profile?.status?.text || ''}
          onChange={(e) => 
            setProfile(p => ({
              ...p!,
              status: { ...p!.status, text: e.target.value }
            }))
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="What's your status?"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {saving ? <LoadingSpinner /> : 'Save Changes'}
      </button>
    </form>
  );
} 