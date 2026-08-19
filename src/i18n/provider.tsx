'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from 'next-intl';
import type { Locale } from './config';
import { useMemo } from 'react';

interface I18nProviderProps {
  children: React.ReactNode;
  locale?: Locale;
}

// Default fallback messages during build/SSR
const defaultMessages: Record<
  string,
  Record<string, string | Record<string, string>>
> = {
  navigation: {
    today: 'Today',
    next7Days: 'Next 7 Days',
    upcoming: 'Upcoming',
    completed: 'Completed',
    kanban: 'Kanban',
    gantt: 'Gantt',
    analytics: 'Analytics',
    settings: 'Settings',
    calendarSync: 'Calendar Sync',
    calendar: 'Calendar',
    graph: 'Dependency Graph',
    matrix: 'Eisenhower Matrix',
    ai: 'AI Assistant',
    goals: 'Goals & Habits',
    blocked: 'Blocked Tasks',
  },
  filterPresets: {
    needsAttention: 'Needs Attention',
    thisWeek: 'This Week',
    withLabels: 'With Labels',
    withSubtasks: 'With Subtasks',
  },
  tasks: {
    searchPlaceholder: 'Search: "{query}"',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Operation successful',
  },
};

export function I18nProvider({
  children,
  locale: propLocale,
}: I18nProviderProps) {
  // Use locale from props (passed from layout), or fall back to 'en' for build/SSR
  const activeLocale: Locale = propLocale || 'en';

  const messages = useMemo(() => {
    try {
      const msgs = require(`../../messages/${activeLocale}.json`);
      // Merge with defaults to ensure all keys exist
      return { ...defaultMessages, ...msgs };
    } catch (e) {
      // Return defaults during build or if locale file not found
      return defaultMessages;
    }
  }, [activeLocale]);

  return (
    <NextIntlClientProvider locale={activeLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
