import { SeasonalClient } from './SeasonalClient';
import { SeasonalAnimeEntry } from '@/types/seasonal';

// Use internal server-side proxy to bypass CDN hotlinking blocks
const proxify = (url: string) => `/api/proxy/image?url=${encodeURIComponent(url)}`;

import { Suspense } from 'react';

export default function SeasonalPage() {
  return (
    <Suspense fallback={<div className="loading-container">UPLINKING TO SEASONAL SECTOR...</div>}>
      <SeasonalClient 
        initialData={[]} 
        initialSeason="SPRING" 
        initialYear={2026} 
      />
    </Suspense>
  );
}
