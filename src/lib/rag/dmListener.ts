import { getFirestore } from 'firebase-admin/firestore';
import type { Message } from '../types/slack';
import RAGService from './ragService';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

const RAG_AI_USER_ID = 'Y2XqYyUnkmTs5KLnGixYtXan7oh1';

// Initialize Firebase Admin if not already initialized
console.log('Checking Firebase Admin initialization...');
if (!getApps().length) {
  console.log('No Firebase Admin apps found, initializing...');
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    console.log('Environment variables loaded:', {
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!clientEmail,
      privateKeyLength: privateKey?.length,
      privateKeyStart: privateKey?.substring(0, 50)
    });
    
    initializeApp({
      credential: cert({
        projectId: "slack-6698d",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')
      })
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
} else {
  console.log('Firebase Admin already initialized');
}

const db = getFirestore();

export class DMListener {
  private static instance: DMListener;
  private unsubscribers: (() => void)[] = [];
  private ragService: RAGService;
  private startTime: string;
  private activeChannelListeners: Set<string> = new Set();

  private constructor() {
    console.log('Initializing DMListener');
    this.ragService = RAGService.getInstance();
    this.startTime = new Date().toISOString();
  }

  static getInstance(): DMListener {
    if (!DMListener.instance) {
      DMListener.instance = new DMListener();
    }
    return DMListener.instance;
  }

  async startListening() {
    try {
      console.log('Starting DM listener...');
      // Query for DM channels that include RAG-AI
      const dmChannelsQuery = db
        .collection('dmChannels')
        .where('memberIds', 'array-contains', RAG_AI_USER_ID);

      console.log('Setting up DM channels listener...');
      // Listen for new/updated DM channels
      const channelUnsubscribe = dmChannelsQuery.onSnapshot(async (snapshot) => {
        console.log(`DM channels snapshot received. Changes: ${snapshot.docChanges().length}`);
        snapshot.docChanges().forEach(async (change) => {
          console.log(`Channel change type: ${change.type}, channelId: ${change.doc.id}`);
          if (change.type === 'added' || change.type === 'modified') {
            const channelId = change.doc.id;
            const data = change.doc.data();
            console.log('Channel data:', data);
            
            // Only set up listener if we don't already have one for this channel
            if (!this.activeChannelListeners.has(channelId)) {
              await this.listenToChannelMessages(channelId);
            } else {
              console.log(`Channel ${channelId} already has an active listener`);
            }
          }
        });
      }, error => {
        console.error('Error in DM channels listener:', error);
      });

      this.unsubscribers.push(channelUnsubscribe);
      console.log('DM listener started successfully');
    } catch (error) {
      console.error('Error starting DM listener:', error);
      throw error;
    }
  }

  private async listenToChannelMessages(channelId: string) {
    try {
      console.log(`Setting up message listener for channel: ${channelId}`);
      
      // Mark this channel as having an active listener
      this.activeChannelListeners.add(channelId);

      // Listen for new messages in this channel
      const messagesQuery = db
        .collection('messages')
        .where('channelId', '==', channelId)
        .where('createdAt', '>', this.startTime)
        .orderBy('createdAt', 'desc')
        .limit(1); // Only listen for newest messages

      const messageUnsubscribe = messagesQuery.onSnapshot(async (snapshot) => {
        console.log(`Messages snapshot received for channel ${channelId}. Changes: ${snapshot.docChanges().length}`);
        for (const change of snapshot.docChanges()) {
          console.log(`Message change type: ${change.type}`);
          if (change.type === 'added') {
            const message = change.doc.data() as Message;
            console.log('Message data:', message);
            
            // Only process messages from other users, not from RAG-AI
            if (message.userId !== RAG_AI_USER_ID) {
              console.log('Processing message from user:', message.userId);
              await this.handleNewMessage(message);
            } else {
              console.log('Skipping message from RAG-AI');
            }
          }
        }
      }, error => {
        console.error(`Error in messages listener for channel ${channelId}:`, error);
      });

      // Add an unsubscribe function that also removes the channel from activeChannelListeners
      const cleanup = () => {
        messageUnsubscribe();
        this.activeChannelListeners.delete(channelId);
      };

      this.unsubscribers.push(cleanup);
      console.log(`Message listener set up for channel: ${channelId}`);
    } catch (error) {
      console.error(`Error listening to channel ${channelId}:`, error);
      // Clean up on error
      this.activeChannelListeners.delete(channelId);
    }
  }

  private async handleNewMessage(message: Message) {
    try {
      console.log('Handling new message:', message.content);
      // Show typing indicator
      await this.setTypingIndicator(message.channelId, true);

      // Process message through RAG pipeline
      console.log('Processing through RAG pipeline...');
      const response = await this.ragService.processQuery(message.content);
      console.log('RAG response:', response);

      // Send response
      await this.sendResponse(message.channelId, response.response);

      // Clear typing indicator
      await this.setTypingIndicator(message.channelId, false);
      console.log('Message handling completed');
    } catch (error) {
      console.error('Error handling message:', error);
      // Send error message to user
      await this.sendResponse(
        message.channelId,
        "I'm sorry, I encountered an error processing your message. Please try again."
      );
      await this.setTypingIndicator(message.channelId, false);
    }
  }

  private async sendResponse(channelId: string, content: string) {
    try {
      console.log(`Sending response to channel ${channelId}:`, content);
      await db.collection('messages').add({
        channelId,
        content,
        userId: RAG_AI_USER_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('Response sent successfully');
    } catch (error) {
      console.error('Error sending response:', error);
      throw error;
    }
  }

  private async setTypingIndicator(channelId: string, isTyping: boolean) {
    try {
      console.log(`Setting typing indicator for channel ${channelId}:`, isTyping);
      await db.collection('dmChannels').doc(channelId).update({
        [`typingUsers.${RAG_AI_USER_ID}`]: isTyping ? new Date().toISOString() : null
      });
      console.log('Typing indicator updated');
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  }

  stopListening() {
    console.log('Stopping DM listener...');
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    this.activeChannelListeners.clear();
    console.log('DM listener stopped');
  }
}

export default DMListener; 