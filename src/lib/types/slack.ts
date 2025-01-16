export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: WorkspaceMember[];
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: string[];
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  channelId: string;
  workspaceId: string;
  threadId?: string;       // Points to parent message if this is a reply
  threadCount?: number;    // Count of replies for parent messages
  lastReplyAt?: string;    // Timestamp of last reply for parent messages
  isThreadParent?: boolean;// True if this message is a thread parent
  attachments: Attachment[];
  mentions: string[];
  reactions: MessageReaction[];  // Added reactions array
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  isPinned: boolean;
  // Future expansions or flags go here
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface DirectMessage extends Message {
  channelId: string;
}

/**
 * Represents a direct message channel (1:1 or group).
 */
export interface DirectMessageMember {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface DirectMessageChannel {
  id: string;
  workspaceId: string;
  members: DirectMessageMember[];
  memberIds: string[]; // Array of user IDs for querying
  type: 'dm' | 'group';
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  presence?: 'active' | 'busy' | 'offline';
  status?: {
    text: string;
    emoji?: string;
    expiresAt?: string;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: NotificationPreferences;
  };
}

export interface NotificationPreferences {
  desktop: boolean;
  mobile: boolean;
  email: boolean;
  mentionsOnly: boolean;
}

export interface MessageReaction {
  emoji: string;    // The emoji character/unified code
  users: string[];  // Array of userIds who reacted
  count: number;    // Quick access to reaction count
}

export interface Document {
  id: string;
  workspaceId: string;
  channelId: string;
  uploaderId: string;
  fileName: string;
  fileType: string;
  storageUrl: string;
  textContent?: string;
  vectorized: boolean;
  vectorizedAt?: string;
  createdAt: string;
  updatedAt: string;
}