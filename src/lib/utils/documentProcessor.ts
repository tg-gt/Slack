import { db } from '../firebase/firebase';
import { addDoc, collection } from 'firebase/firestore';
import type { Document } from '../types/slack';

/**
 * Process and vectorize a document
 */
export async function processDocument(document: Document) {
  try {
    console.log('Sending document to process:', document);
    const response = await fetch('/api/documents/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`Failed to process document: ${errorText}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

/**
 * Create a new document record
 */
export async function createDocument(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'vectorized'>): Promise<Document> {
  const now = new Date().toISOString();
  const docData = {
    ...data,
    vectorized: false,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'documents'), docData);
  return { ...docData, id: docRef.id } as Document;
} 