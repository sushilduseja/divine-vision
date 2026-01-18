'use client';

import { useState, useEffect, useRef } from 'react';
import { Verse, SourceType } from '@/types';
import { loadVerseChunk, getChunkId } from '@/lib/data/loader';

interface UseProgressiveVerseLoadOptions {
  chunkIds: string[];
  source: SourceType;
  onProgress?: (loaded: number, total: number) => void;
}

export function useProgressiveVerseLoad({
  chunkIds,
  source,
  onProgress
}: UseProgressiveVerseLoadOptions) {
  const [loaded, setLoaded] = useState<Map<string, Verse[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    
    async function load() {
      setLoading(true);
      setError(null);
      
      for (let i = 0; i < chunkIds.length; i++) {
        if (!mountedRef.current) break;
        
        const chunkId = chunkIds[i];
        try {
          const verses = await loadVerseChunk(source, chunkId);
          
          if (mountedRef.current) {
            setLoaded(prev => new Map(prev).set(chunkId, verses));
            onProgress?.(i + 1, chunkIds.length);
          }
        } catch (err) {
          if (mountedRef.current) {
            setError(err instanceof Error ? err : new Error('Failed to load verses'));
          }
        }
      }
      
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    
    load();
    
    return () => {
      mountedRef.current = false;
    };
  }, [chunkIds.join(','), source, onProgress]);
  
  const verses = Array.from(loaded.values()).flat();
  
  return { verses, loading, error };
}
