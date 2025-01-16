'use client';

import { useEffect } from 'react';

export default function RAGListener() {
  useEffect(() => {
    const startRAGListener = async () => {
      try {
        console.log('Starting RAG listener...');
        const response = await fetch('/api/rag/listen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'start' }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to start RAG listener:', error);
        } else {
          console.log('RAG listener started successfully');
        }
      } catch (error) {
        console.error('Error starting RAG listener:', error);
      }
    };

    startRAGListener();

    // Cleanup function to stop the listener when the component unmounts
    return () => {
      fetch('/api/rag/listen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'stop' }),
      }).catch(error => {
        console.error('Error stopping RAG listener:', error);
      });
    };
  }, []);

  return null;
} 