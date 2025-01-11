import { db, storage } from './firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  setDoc,
  doc as firestoreDoc,
  DocumentReference,
  limit as firestoreLimit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Workspace, Channel, Message, DirectMessage, UserProfile, Attachment } from '../types/slack';

// Workspace functions
export const createWorkspace = async (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    console.log('Creating workspace in Firestore:', workspace);

    const now = new Date().toISOString();
    const workspaceData = {
      ...workspace,
      members: [workspace.ownerId],
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, 'workspaces'), workspaceData);
    
    console.log('Workspace created, creating general channel...');

    // Create a general channel automatically
    await createChannel({
      name: 'general',
      description: "This is the one channel that will always include everyone. It's a great spot for announcements and team-wide conversations.",
      workspaceId: docRef.id,
      isPrivate: false,
      createdBy: workspace.ownerId,
      members: [workspace.ownerId],
    });

    console.log('General channel created successfully');
    return docRef;
  } catch (error) {
    console.error('Detailed error in createWorkspace:', error);
    throw error;
  }
};

export const getWorkspaces = async (userId: string) => {
  try {
    // For now, get all workspaces instead of filtering by user membership
    const workspacesRef = collection(db, 'workspaces');
    const workspacesSnapshot = await getDocs(workspacesRef);
    
    return workspacesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Workspace[];
  } catch (error) {
    console.error('Error getting workspaces:', error);
    throw error;
  }
};

// Channel functions
export const createChannel = async (channel: Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  return addDoc(collection(db, 'channels'), {
    ...channel,
    // For private channels, only creator is initial member
    // For public channels, creator is still a member but visibility is controlled by isPrivate flag
    members: [channel.createdBy],
    createdAt: now,
    updatedAt: now,
  });
};

export const getChannels = async (workspaceId: string, userId: string) => {
  // Get all public channels
  const publicChannelsQuery = query(
    collection(db, 'channels'),
    where('workspaceId', '==', workspaceId),
    where('isPrivate', '==', false),
    orderBy('name')
  );
  
  // Get private channels where user is a member
  const privateChannelsQuery = query(
    collection(db, 'channels'),
    where('workspaceId', '==', workspaceId),
    where('isPrivate', '==', true),
    where('members', 'array-contains', userId),
    orderBy('name')
  );

  const [publicSnapshot, privateSnapshot] = await Promise.all([
    getDocs(publicChannelsQuery),
    getDocs(privateChannelsQuery)
  ]);

  const publicChannels = publicSnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as Channel));
  
  const privateChannels = privateSnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as Channel));

  return [...publicChannels, ...privateChannels];
};

export const getChannel = async (channelId: string): Promise<Channel> => {
  const channelRef = firestoreDoc(db, 'channels', channelId);
  const channelDoc = await getDoc(channelRef);
  
  if (!channelDoc.exists()) {
    throw new Error('Channel not found');
  }
  
  return { id: channelDoc.id, ...channelDoc.data() } as Channel;
};

// New function to invite users to a private channel
export const inviteToChannel = async (channelId: string, userIds: string[]) => {
  const channelRef = firestoreDoc(db, 'channels', channelId);
  const channelDoc = await getDoc(channelRef);
  
  if (!channelDoc.exists()) {
    throw new Error('Channel not found');
  }
  
  const channelData = channelDoc.data() as Channel;
  if (!channelData.isPrivate) {
    throw new Error('Cannot invite to public channel');
  }
  
  // Add new members to the existing members array, avoiding duplicates
  const updatedMembers = Array.from(new Set([
    ...(channelData.members || []),
    ...userIds
  ]));
  
  await updateDoc(channelRef, {
    members: updatedMembers,
    updatedAt: new Date().toISOString()
  });
  
  return updatedMembers;
};

// New function to remove users from a private channel
export const removeFromChannel = async (channelId: string, userIds: string[]) => {
  const channelRef = firestoreDoc(db, 'channels', channelId);
  const channelDoc = await getDoc(channelRef);
  
  if (!channelDoc.exists()) {
    throw new Error('Channel not found');
  }
  
  const channelData = channelDoc.data() as Channel;
  if (!channelData.isPrivate) {
    throw new Error('Cannot remove from public channel');
  }
  
  // Remove users from members array
  const updatedMembers = (channelData.members || []).filter(
    memberId => !userIds.includes(memberId)
  );
  
  await updateDoc(channelRef, {
    members: updatedMembers,
    updatedAt: new Date().toISOString()
  });
  
  return updatedMembers;
};

// Message functions
export const sendMessage = async (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  return addDoc(collection(db, 'messages'), {
    ...message,
    createdAt: now,
    updatedAt: now,
  });
};

export const getMessages = async (channelId: string, messageLimit = 50) => {
  const q = query(
    collection(db, 'messages'),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(messageLimit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
};

// File upload function
export const uploadFile = async (file: File, workspaceId: string): Promise<Attachment> => {
  const path = `workspaces/${workspaceId}/files/${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  return {
    id: path,
    type: file.type.startsWith('image/') ? 'image' : 'file',
    url,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  };
};

export const getProfile = async (userId: string): Promise<UserProfile> => {
  const userDoc = await getDoc(firestoreDoc(db, 'users', userId));
  if (!userDoc.exists()) {
    return {
      id: userId,
      email: '',
      displayName: '',
      preferences: {
        theme: 'light',
        notifications: {
          desktop: true,
          mobile: true,
          email: true,
          mentionsOnly: false,
        },
      },
    };
  }
  return { id: userDoc.id, ...userDoc.data() } as UserProfile;
};

export const updateProfile = async (userId: string, profile: Partial<UserProfile>) => {
  const userRef = firestoreDoc(db, 'users', userId);
  await setDoc(userRef, profile, { merge: true });
};

export const createInitialProfile = async (profile: UserProfile) => {
  const userRef = firestoreDoc(db, 'users', profile.id);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return profile;
};

// User search function
export const searchUsers = async (query: string): Promise<UserProfile[]> => {
  try {
    // Get all users for now - in a real app, you'd want to implement proper search
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as UserProfile));
    
    // Filter by display name containing query
    return users.filter(user => 
      user.displayName.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}; 