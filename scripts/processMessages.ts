import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getAllMessages, messageToMetadata } from '../src/lib/rag/messageLoader';
import { storeEmbedding } from '../src/lib/rag/embeddings';

async function processMessages() {
  try {
    console.log('Fetching all messages...');
    const messages = await getAllMessages();
    console.log(`Found ${messages.length} messages to process`);
    
    let processed = 0;
    for (const message of messages) {
      try {
        if (!message.content) continue; // Skip empty messages
        
        await storeEmbedding(
          message.content,
          messageToMetadata(message)
        );
        
        processed++;
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${messages.length} messages`);
        }
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        // Continue with next message
      }
      
      // Simple rate limiting - wait 100ms between messages
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Finished processing ${processed} messages`);
  } catch (error) {
    console.error('Failed to process messages:', error);
  }
}

processMessages(); 