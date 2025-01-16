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
  limit as firestoreLimit,
  doc,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  onSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import type {
  Workspace,
  Channel,
  Message,
  DirectMessage,
  UserProfile,
  Attachment,
  DirectMessageChannel
} from '../types/slack';

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

export const updateWorkspace = async (workspaceId: string, userId: string, updates: Partial<Workspace>) => {
  try {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceDoc = await getDoc(workspaceRef);
    
    if (!workspaceDoc.exists()) {
      throw new Error('Workspace not found');
    }

    const workspace = workspaceDoc.data() as Workspace;
    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can update workspace settings');
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(workspaceRef, updatedData);
    return { ...workspace, ...updatedData };
  } catch (error) {
    console.error('Error updating workspace:', error);
    throw error;
  }
};

export const deleteWorkspace = async (workspaceId: string, userId: string) => {
  try {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceDoc = await getDoc(workspaceRef);
    
    if (!workspaceDoc.exists()) {
      throw new Error('Workspace not found');
    }

    const workspace = workspaceDoc.data() as Workspace;
    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can delete workspace');
    }

    // Delete all channels in the workspace
    const channelsQuery = query(
      collection(db, 'channels'),
      where('workspaceId', '==', workspaceId)
    );
    const channelsSnapshot = await getDocs(channelsQuery);
    await Promise.all(channelsSnapshot.docs.map(doc => deleteDoc(doc.ref)));

    // Delete all messages in the workspace
    const messagesQuery = query(
      collection(db, 'messages'),
      where('workspaceId', '==', workspaceId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    await Promise.all(messagesSnapshot.docs.map(doc => deleteDoc(doc.ref)));

    // Delete all direct messages in the workspace
    const directMessagesQuery = query(
      collection(db, 'directMessages'),
      where('workspaceId', '==', workspaceId)
    );
    const directMessagesSnapshot = await getDocs(directMessagesQuery);
    await Promise.all(directMessagesSnapshot.docs.map(doc => deleteDoc(doc.ref)));

    // Delete all DM channels in the workspace
    const dmChannelsQuery = query(
      collection(db, 'dmChannels'),
      where('workspaceId', '==', workspaceId)
    );
    const dmChannelsSnapshot = await getDocs(dmChannelsQuery);
    await Promise.all(dmChannelsSnapshot.docs.map(doc => deleteDoc(doc.ref)));

    // Finally delete the workspace itself
    await deleteDoc(workspaceRef);

    return true;
  } catch (error) {
    console.error('Error deleting workspace:', error);
    throw error;
  }
};

// Channel functions
export const createChannel = async (channel: Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  return addDoc(collection(db, 'channels'), {
    ...channel,
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

// Invite to private channel
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
export const uploadFile = async (file: File, workspaceId: string, channelId: string, userId: string): Promise<Attachment> => {
  try {
    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 50MB limit');
    }

    // Validate file type
    const allowedTypes = [
      'image/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (!allowedTypes.some(type => file.type.startsWith(type))) {
      throw new Error('File type not supported');
    }

    // Create a unique filename to prevent collisions
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const path = `workspaces/${workspaceId}/files/${uniqueFileName}`;
    
    const storageRef = ref(storage, path);
    
    // Add metadata to the upload
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name
      }
    };

    await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(storageRef);
    
    // Create attachment object
    const attachment: Attachment = {
      id: path,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      url,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };

    // If the file is a document that can be vectorized, create a document record
    const vectorizableTypes = ['application/pdf', 'text/plain'];
    console.log('File type:', file.type, 'Vectorizable:', vectorizableTypes.includes(file.type));
    if (vectorizableTypes.includes(file.type)) {
      try {
        console.log('Attempting to process document:', file.name);
        const { createDocument, processDocument } = await import('../utils/documentProcessor');
        const doc = await createDocument({
          workspaceId,
          channelId,
          uploaderId: userId,
          fileName: file.name,
          fileType: file.type,
          storageUrl: url,
        });
        console.log('Document record created:', doc);

        // Process document in the background
        console.log('Starting document processing...');
        processDocument(doc).catch(error => {
          console.error('Error processing document:', error);
          // You might want to add error handling/retry logic here
        });
      } catch (error) {
        console.error('Error creating document record:', error);
        // Continue anyway since the file upload succeeded
      }
    }

    return attachment;
  } catch (error: any) {
    console.error('Error uploading file:', error);
    throw new Error(error.message || 'Failed to upload file');
  }
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
  const data = userDoc.data() as UserProfile;
  return {
    ...data,
    preferences: {
      ...data.preferences,
      theme: 'light'
    }
  };
};

export const updateProfile = async (userId: string, profile: Partial<UserProfile>) => {
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();
  
  await updateDoc(userRef, {
    ...profile,
    updatedAt: now
  });

  // Also update Firebase Auth profile if display name or photo URL changed
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (currentUser) {
    if (profile.displayName || profile.avatarUrl) {
      await updateFirebaseProfile(currentUser, {
        displayName: profile.displayName,
        photoURL: profile.avatarUrl
      });
    }
  }

  return { id: userId, ...profile };
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

// User search
export const searchUsers = async (queryString: string): Promise<UserProfile[]> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as UserProfile));
    
    return users.filter(user => 
      user.displayName.toLowerCase().includes(queryString.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = firestoreDoc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Create a direct message channel (1:1 or group).
 */
export const createDirectMessageChannel = async (workspaceId: string, members: UserProfile[]) => {
  try {
    console.log('Creating DM channel with data:', { workspaceId, members });
    
    const now = new Date().toISOString();
    const channelData = {
      workspaceId,
      members: members.map(m => ({
        id: m.id,
        displayName: m.displayName,
        ...(m.avatarUrl ? { avatarUrl: m.avatarUrl } : {})
      })),
      memberIds: members.map(m => m.id),
      type: 'dm' as const,
      lastMessage: null,
      createdAt: now,
      updatedAt: now
    };

    console.log('Prepared channel data:', channelData);

    const docRef = await addDoc(collection(db, 'dmChannels'), channelData);

    console.log('Successfully created DM channel with ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('Detailed error creating DM channel:', error);
    console.error('Error context:', {
      workspaceId,
      memberDetails: members.map(m => ({
        id: m.id,
        hasDisplayName: !!m.displayName,
        hasEmail: !!m.email,
        hasPreferences: !!m.preferences
      }))
    });
    throw error;
  }
};

export const getDirectMessageChannels = async (workspaceId: string, userId: string) => {
  try {
    console.log('Querying DM channels with:', { workspaceId, userId });
    
    const q = query(
      collection(db, 'dmChannels'),
      where('workspaceId', '==', workspaceId),
      where('memberIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    console.log('DM channels query result:', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as DirectMessageChannel));
  } catch (error) {
    console.error('Error getting DM channels:', error);
    throw error;
  }
};

export const getDirectMessages = async (channelId: string, messageLimit = 50) => {
  const q = query(
    collection(db, 'directMessages'),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(messageLimit)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as DirectMessage));
};

export const sendDirectMessage = async (message: Omit<DirectMessage, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  const messageRef = await addDoc(collection(db, 'directMessages'), {
    ...message,
    createdAt: now,
    updatedAt: now,
  });

  // Update the DM channel's lastMessage
  const channelRef = firestoreDoc(db, 'dmChannels', message.channelId);
  await updateDoc(channelRef, {
    lastMessage: {
      id: messageRef.id,
      content: message.content,
      senderId: message.userId,
      createdAt: now
    },
    updatedAt: now
  });

  return messageRef;
};

export const editMessage = async (messageId: string, content: string) => {
  try {
    const messageRef = firestoreDoc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      content,
      isEdited: true,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
};

export const deleteMessage = async (messageId: string) => {
  try {
    const messageRef = firestoreDoc(db, 'messages', messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

export const getMessageRef = (workspaceId: string, channelId: string, messageId: string) => {
  return doc(db, 'messages', messageId);
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const fileRef = ref(storage, `avatars/${userId}/${file.name}`);
  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);
  return downloadURL;
};

/**
 * Get a single direct message channel by ID
 */
export async function getDirectMessageChannel(channelId: string): Promise<DirectMessageChannel | null> {
  const docRef = doc(db, 'dmChannels', channelId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data()
  } as DirectMessageChannel;
}

export const updateChannel = async (channelId: string, userId: string, updates: Partial<Channel>) => {
  try {
    const channelRef = firestoreDoc(db, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);
    
    if (!channelDoc.exists()) {
      throw new Error('Channel not found');
    }

    const channel = channelDoc.data() as Channel;
    if (channel.createdBy !== userId) {
      throw new Error('Only channel creator can update channel settings');
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(channelRef, updatedData);
    return { ...channel, ...updatedData };
  } catch (error) {
    console.error('Error updating channel:', error);
    throw error;
  }
};

export const deleteChannel = async (channelId: string, userId: string) => {
  try {
    const channelRef = firestoreDoc(db, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);
    
    if (!channelDoc.exists()) {
      throw new Error('Channel not found');
    }

    const channel = channelDoc.data() as Channel;
    if (channel.createdBy !== userId) {
      throw new Error('Only channel creator can delete channel');
    }

    // Delete all messages in the channel
    const messagesQuery = query(
      collection(db, 'messages'),
      where('channelId', '==', channelId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    await Promise.all(messagesSnapshot.docs.map(doc => deleteDoc(doc.ref)));

    // Delete the channel itself
    await deleteDoc(channelRef);

    return true;
  } catch (error) {
    console.error('Error deleting channel:', error);
    throw error;
  }
};