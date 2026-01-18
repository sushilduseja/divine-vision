'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface Concept {
  name: string;
  frequency: number;
  color?: string;
}

interface ConceptGraphProps {
  concepts: Concept[];
  onConceptClick?: (concept: string) => void;
}

export function ConceptGraph({ concepts, onConceptClick }: ConceptGraphProps) {
  const displayConcepts = useMemo(() => {
    if (!concepts || concepts.length === 0) return [];
    
    const maxFreq = Math.max(...concepts.map(c => c.frequency));
    
    return concepts.map(concept => {
      const frequency = concept.frequency || 1;
      // Responsive sizing: scale between 0.75 (small, mobile) and 1.25 (large, desktop)
      const size = Math.max(0.75, Math.min(1.25, frequency / maxFreq * 1.5));
      
      return {
        ...concept,
        size,
        fontSize: Math.max(0.75, Math.min(1.1, size))
      };
    });
  }, [concepts]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 md:gap-3">
        {displayConcepts.map((concept) => (
          <Badge
            key={concept.name}
            variant="outline"
            className={`
              cursor-pointer transition-all hover:scale-105 hover:bg-primary/10
              text-xs md:text-sm
              px-2 md:px-3 py-1 md:py-1.5
              ${concept.color || 'border-primary/20'}
            `}
            onClick={() => onConceptClick?.(concept.name)}
            style={{
              transform: `scale(${concept.size})`,
              transformOrigin: 'left center'
            }}
          >
            <span className="text-xs md:text-sm">{concept.name}</span>
            <span className="text-xs ml-1 opacity-60">
              {concept.frequency}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
