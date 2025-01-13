'use client';

import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { MessageReaction } from '@/lib/types/slack';
import { updateDoc } from 'firebase/firestore';
import { getMessageRef } from '@/lib/firebase/slackUtils';

interface ReactionPickerProps {
  messageId: string;
  channelId: string;
  workspaceId: string;
  reactions: MessageReaction[];
  onReactionUpdate?: () => void;
}

export default function ReactionPicker({ 
  messageId, 
  channelId,
  workspaceId, 
  reactions = [],
  onReactionUpdate 
}: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsidePicker = pickerRef.current && !pickerRef.current.contains(target);
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      
      if (isOutsidePicker && isOutsideButton) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleReaction = async (emojiData: EmojiClickData) => {
    if (!user) return;
    
    const messageRef = getMessageRef(workspaceId, channelId, messageId);
    const currentReactions = Array.isArray(reactions) ? reactions : [];
    const existingReaction = currentReactions.find(r => r.emoji === emojiData.emoji);
    
    if (existingReaction) {
      // User already reacted - remove their reaction
      if (existingReaction.users.includes(user.uid)) {
        const updatedUsers = existingReaction.users.filter(id => id !== user.uid);
        if (updatedUsers.length === 0) {
          // Remove the entire reaction if no users left
          await updateDoc(messageRef, {
            reactions: currentReactions.filter(r => r.emoji !== emojiData.emoji)
          });
        } else {
          // Update users array and count
          await updateDoc(messageRef, {
            reactions: currentReactions.map(r => 
              r.emoji === emojiData.emoji 
                ? { ...r, users: updatedUsers, count: updatedUsers.length }
                : r
            )
          });
        }
      } else {
        // Add user to existing reaction
        await updateDoc(messageRef, {
          reactions: currentReactions.map(r => 
            r.emoji === emojiData.emoji 
              ? { 
                  ...r, 
                  users: [...r.users, user.uid],
                  count: r.count + 1
                }
              : r
          )
        });
      }
    } else {
      // Create new reaction
      await updateDoc(messageRef, {
        reactions: [...currentReactions, {
          emoji: emojiData.emoji,
          users: [user.uid],
          count: 1
        }]
      });
    }

    setShowPicker(false);
    onReactionUpdate?.();
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        ref={buttonRef}
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <span role="img" aria-label="add reaction">
          😀
        </span>
      </button>
      
      {showPicker && (
        <div className="absolute z-[100] right-0 top-8">
          <div className="bg-white rounded-lg shadow-lg p-2">
            <EmojiPicker 
              onEmojiClick={toggleReaction}
              width={350}
              height={400}
            />
          </div>
        </div>
      )}
    </div>
  );
} 