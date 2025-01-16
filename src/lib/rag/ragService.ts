import OpenAI from 'openai';
import { queryEmbeddings } from './embeddings';
import type { Message, Document } from '../types/slack';
import type { PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: "slack-6698d",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // The private key comes from .env.local and needs the newlines replaced
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')
    })
  });
}

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RAGResponse {
  response: string;
  sourceMessages?: Array<{
    content: string;
    timestamp: number;
    sender: string;
  }>;
  sourceDocuments?: Array<{
    fileName: string;
    content: string;
  }>;
}

interface MessageMetadata extends RecordMetadata {
  messageId: string;
  timestamp: number;
  userId: string;
}

interface DocumentMetadata extends RecordMetadata {
  id: string;
  parentId: string;
  fileName: string;
  type: 'document';
  chunkIndex: number;
  totalChunks: number;
}

class RAGService {
  private static instance: RAGService;
  
  static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  private async getMessageContents(messageIds: string[]): Promise<Map<string, Message>> {
    const messages = new Map<string, Message>();
    
    const promises = messageIds.map(async (messageId) => {
      const messageDoc = await db.collection('messages').doc(messageId).get();
      if (messageDoc.exists) {
        messages.set(messageId, { id: messageDoc.id, ...messageDoc.data() } as Message);
      }
    });
    
    await Promise.all(promises);
    return messages;
  }

  private async getDocumentContents(documentIds: string[]): Promise<Map<string, Document>> {
    const documents = new Map<string, Document>();
    
    const promises = documentIds.map(async (docId) => {
      const docRef = await db.collection('documents').doc(docId).get();
      if (docRef.exists) {
        documents.set(docId, { id: docRef.id, ...docRef.data() } as Document);
      }
    });
    
    await Promise.all(promises);
    return documents;
  }

  private isMessageMetadata(metadata: any): metadata is MessageMetadata {
    return metadata && 'messageId' in metadata;
  }

  private isDocumentMetadata(metadata: any): metadata is DocumentMetadata {
    return metadata && metadata.type === 'document';
  }

  private async formatContext(matches: PineconeRecord[]): Promise<string> {
    const messageMatches: PineconeRecord[] = [];
    const documentMatches: PineconeRecord[] = [];
    
    // Separate matches by type
    matches.forEach(match => {
      if (match.metadata && this.isMessageMetadata(match.metadata)) {
        messageMatches.push(match);
      } else if (match.metadata && this.isDocumentMetadata(match.metadata)) {
        documentMatches.push(match);
      }
    });

    let context = '';

    // Process message matches
    if (messageMatches.length > 0) {
      const messageIds = messageMatches
        .filter(match => match.metadata)
        .map(match => (match.metadata as MessageMetadata).messageId);
      const messages = await this.getMessageContents(messageIds);
      
      const messageContext = messageMatches
        .filter(match => match.metadata && messages.has((match.metadata as MessageMetadata).messageId))
        .sort((a, b) => {
          const metadataA = a.metadata as MessageMetadata;
          const metadataB = b.metadata as MessageMetadata;
          return metadataA.timestamp - metadataB.timestamp;
        })
        .map(match => {
          if (!match.metadata) return '';
          const metadata = match.metadata as MessageMetadata;
          const message = messages.get(metadata.messageId)!;
          const date = new Date(metadata.timestamp).toLocaleString();
          return `[Chat Message - ${date}] User ${message.userName || metadata.userId}: ${message.content}`;
        })
        .filter(text => text.length > 0)
        .join('\n');
      
      if (messageContext) {
        context += 'Chat History:\n' + messageContext + '\n\n';
      }
    }

    // Process document matches
    if (documentMatches.length > 0) {
      const documentIds = Array.from(new Set(documentMatches
        .filter(match => match.metadata)
        .map(match => (match.metadata as DocumentMetadata).parentId)));
      const documents = await this.getDocumentContents(documentIds);
      
      const documentContext = documentMatches
        .filter(match => match.metadata)
        .sort((a, b) => {
          const metadataA = a.metadata as DocumentMetadata;
          const metadataB = b.metadata as DocumentMetadata;
          return metadataA.chunkIndex - metadataB.chunkIndex;
        })
        .map(match => {
          if (!match.metadata) return '';
          const metadata = match.metadata as DocumentMetadata;
          const document = documents.get(metadata.parentId);
          const content = typeof metadata.content === 'string' ? metadata.content : '';
          return `[Document: ${document?.fileName || metadata.fileName} - Part ${metadata.chunkIndex + 1}/${metadata.totalChunks}]\n${content}`;
        })
        .filter(text => text.length > 0)
        .join('\n\n');
      
      if (documentContext) {
        context += 'Document Content:\n' + documentContext;
      }
    }

    return context;
  }

  async processQuery(query: string): Promise<RAGResponse> {
    try {
      // Get relevant content using queryEmbeddings
      const matches = await queryEmbeddings(query, 15);
      
      if (!matches.length) {
        return {
          response: "I couldn't find any relevant information.",
          sourceMessages: [],
          sourceDocuments: []
        };
      }

      // Filter matches by similarity score
      const relevantMatches = matches.filter(match => match.score && match.score > 0.3);

      if (!relevantMatches.length) {
        return {
          response: "I couldn't find any information that was relevant enough to your query.",
          sourceMessages: [],
          sourceDocuments: []
        };
      }

      // Format context from both messages and documents
      const context = await this.formatContext(relevantMatches);
      
      // Get OpenAI completion
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant that answers questions based on chat history and document content.
            Use the provided context to answer the user's question.
            If you're not sure about something, say so.
            Always maintain a friendly and professional tone.
            Format your responses in a clear and readable way.
            If you reference specific messages or documents, include their details.
            Focus on the most relevant information from the context.`
          },
          {
            role: "user",
            content: `Here is the relevant context:
            ${context}
            
            User's question: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      // Prepare source information
      const sourceMessages = relevantMatches
        .filter(match => match.metadata && this.isMessageMetadata(match.metadata))
        .map(match => {
          if (!match.metadata) return null;
          const metadata = match.metadata as MessageMetadata;
          const content = typeof metadata.content === 'string' ? metadata.content : '';
          return {
            content,
            timestamp: metadata.timestamp,
            sender: metadata.userId
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const sourceDocuments = relevantMatches
        .filter(match => match.metadata && this.isDocumentMetadata(match.metadata))
        .map(match => {
          if (!match.metadata) return null;
          const metadata = match.metadata as DocumentMetadata;
          const content = typeof metadata.content === 'string' ? metadata.content : '';
          return {
            fileName: metadata.fileName,
            content
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return {
        response: completion.choices[0].message.content || "Sorry, I couldn't generate a response.",
        sourceMessages,
        sourceDocuments
      };
    } catch (error) {
      console.error('RAG processing error:', error);
      throw new Error('Failed to process query');
    }
  }
}

export default RAGService; 