'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
}

// Report Web Vitals to analytics service
export function reportWebVitals(metric: WebVitalsMetric) {
  // In production, send to analytics service
  if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
    // Example: Send to PostHog, Mixpanel, etc.
    console.log('Web Vital:', metric);
  }
}

export function WebVitalsTracker() {
  // Safe hook usage - only run in client
  useEffect(() => {
    // Route change analytics - skip if not in browser
    if (typeof window === 'undefined') return;

    // Track page view on mount
    reportWebVitals({
      id: 'page_view',
      name: 'Page View',
      value: 1,
    });
  }, []);

  return null;
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  useEffect(() => {
    // Measure component mount time
    const start = performance.now();

    return () => {
      const end = performance.now();
      const duration = end - start;

      if (duration > 16) {
        // Log slow renders (> 16ms = 60fps threshold)
        console.warn(`Slow component render: ${duration.toFixed(2)}ms`);
      }
    };
  }, []);
}
