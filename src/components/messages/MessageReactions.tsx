'use client';

import { MessageReaction } from '@/lib/types/slack';
import { useAuth } from '@/lib/hooks/useAuth';
import { getMessageRef, getUserProfile } from '@/lib/firebase/slackUtils';
import { updateDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  messageId: string;
  channelId: string;
  workspaceId: string;
}

interface UserInfo {
  id: string;
  displayName: string;
}

export default function MessageReactions({ 
  reactions, 
  messageId,
  channelId,
  workspaceId
}: MessageReactionsProps) {
  const { user } = useAuth();
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserInfo>>({});

  // Fetch user profiles when needed
  useEffect(() => {
    if (!hoveredReaction) return;

    const reaction = reactions.find(r => r.emoji === hoveredReaction);
    if (!reaction) return;

    const missingUsers = reaction.users.filter(uid => !userProfiles[uid]);
    if (missingUsers.length === 0) return;

    const fetchUsers = async () => {
      const profiles = await Promise.all(
        missingUsers.map(async (uid) => {
          const profile = await getUserProfile(uid);
          return profile ? {
            id: uid,
            displayName: profile.displayName || uid.slice(0, 6)
          } : null;
        })
      );

      setUserProfiles(prev => ({
        ...prev,
        ...Object.fromEntries(
          profiles
            .filter((p): p is UserInfo => p !== null)
            .map(p => [p.id, p])
        )
      }));
    };

    fetchUsers();
  }, [hoveredReaction, reactions]);

  const formatUserList = (userIds: string[]) => {
    const names = userIds.map(id => userProfiles[id]?.displayName || 'User').filter(Boolean);
    
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
    return `${names[0]}, ${names[1]}, and ${names.length - 2} others`;
  };

  if (!reactions.length) return null;

  const handleReactionClick = async (emoji: string) => {
    if (!user) return;
    
    const messageRef = getMessageRef(workspaceId, channelId, messageId);
    const existingReaction = reactions.find(r => r.emoji === emoji);
    
    if (existingReaction) {
      if (existingReaction.users.includes(user.uid)) {
        // Remove user's reaction
        const updatedUsers = existingReaction.users.filter(id => id !== user.uid);
        if (updatedUsers.length === 0) {
          await updateDoc(messageRef, {
            reactions: reactions.filter(r => r.emoji !== emoji)
          });
        } else {
          await updateDoc(messageRef, {
            reactions: reactions.map(r => 
              r.emoji === emoji 
                ? { ...r, users: updatedUsers, count: updatedUsers.length }
                : r
            )
          });
        }
      } else {
        // Add user's reaction
        await updateDoc(messageRef, {
          reactions: reactions.map(r => 
            r.emoji === emoji 
              ? { 
                  ...r, 
                  users: [...r.users, user.uid],
                  count: r.count + 1
                }
              : r
          )
        });
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => {
        const hasReacted = user && reaction.users.includes(user.uid);
        
        return (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji)}
            onMouseEnter={() => setHoveredReaction(reaction.emoji)}
            onMouseLeave={() => setHoveredReaction(null)}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-full
              ${hasReacted 
                ? 'bg-blue-100 dark:bg-blue-900' 
                : 'bg-gray-100 dark:bg-gray-700'
              } hover:bg-gray-200 dark:hover:bg-gray-600 relative
            `}
          >
            <span role="img" aria-label={`emoji ${reaction.emoji}`}>
              {reaction.emoji}
            </span>
            <span className="text-xs">{reaction.count}</span>
            
            {/* Tooltip */}
            {hoveredReaction === reaction.emoji && (
              <div className="absolute bottom-full left-0 mb-1 z-50 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                {formatUserList(reaction.users)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
} 