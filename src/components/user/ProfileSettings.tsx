'use client';

import { useState, useRef, useEffect } from 'react';
import { UserProfile } from '@/lib/types/slack';
import { useAuth } from '@/lib/hooks/useAuth';
import { updateProfile, getUserProfile } from '@/lib/firebase/slackUtils';
import { Camera, X } from 'lucide-react';

type PresenceState = 'active' | 'busy' | 'offline';

export default function ProfileSettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [status, setStatus] = useState('');
  const [presence, setPresence] = useState<PresenceState>('active');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const loadProfile = async () => {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setDisplayName(profile.displayName);
            setStatus(profile.status?.text || '');
            setPresence(profile.presence || 'active');
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadProfile();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // TODO: Implement file upload to Firebase Storage
      // const avatarUrl = await uploadAvatar(file);
      // await updateProfile(user!.uid, { avatarUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await updateProfile(user.uid, {
        displayName,
        status: { text: status },
        presence
      });
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Profile Settings</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div 
                  className="relative w-24 h-24 rounded-full bg-gray-200 cursor-pointer overflow-hidden"
                  onClick={handleAvatarClick}
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Camera size={32} className="text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="What's your status?"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Presence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presence
                </label>
                <select
                  value={presence}
                  onChange={(e) => setPresence(e.target.value as PresenceState)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 