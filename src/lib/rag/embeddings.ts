import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index(process.env.PINECONE_INDEX!);

export interface MessageMetadata {
  messageId: string;
  userId: string;
  channelId: string;
  timestamp: number;
  threadId?: string;
  [key: string]: any;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    input: text,
    model: "text-embedding-3-large"
  });
  
  return response.data[0].embedding;
}

export async function storeEmbedding(
  text: string,
  metadata: MessageMetadata
) {
  const embedding = await generateEmbedding(text);
  
  await index.upsert([{
    id: metadata.messageId,
    values: embedding,
    metadata
  }]);
}

export async function queryEmbeddings(
  query: string,
  topK: number = 5
) {
  const queryEmbedding = await generateEmbedding(query);
  
  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true
  });
  
  return results.matches;
} 