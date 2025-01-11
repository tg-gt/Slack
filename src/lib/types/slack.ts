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
  threadId?: string;
  attachments: Attachment[];
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  isPinned: boolean;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface DirectMessage extends Omit<Message, 'channelId'> {
  participants: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
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