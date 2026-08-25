'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface EnhancedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function EnhancedSearch({
  value,
  onChange,
  placeholder,
  className,
}: EnhancedSearchProps) {
  const t = useTranslations('search');
  const defaultPlaceholder = t('placeholder');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstHistoryItemRef = useRef<HTMLButtonElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taskSearchHistory');
      if (saved) {
        try {
          setSearchHistory(JSON.parse(saved));
        } catch {
          setSearchHistory([]);
        }
      }
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    const newHistory = [
      query.trim(),
      ...searchHistory.filter(s => s !== query.trim()),
    ].slice(0, 10);

    setSearchHistory(newHistory);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskSearchHistory', JSON.stringify(newHistory));
    }
  }, [searchHistory]);

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
    if (newValue !== value && newValue.length > 2) {
      saveToHistory(newValue);
    }
  }, [onChange, value, saveToHistory]);

  const clearSearch = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleClearHistory = useCallback(() => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('taskSearchHistory');
    }
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowHistory(false);
    }
  };

  const selectHistoryItem = (item: string) => {
    onChange(item);
    setShowHistory(false);
    saveToHistory(item);
    inputRef.current?.focus();
  };

  const openHistory = () => {
    setShowHistory(true);
    // Focus the first history item after popover opens
    setTimeout(() => {
      firstHistoryItemRef.current?.focus();
    }, 100);
  };

  const closeHistory = () => {
    setShowHistory(false);
    inputRef.current?.focus();
  };

  // Focus input on initial mount if empty
  const isInitialMount = useRef(true);

  // Set initial focus to input on mount if empty
  useEffect(() => {
    if (isInitialMount.current && inputRef.current && !value) {
      inputRef.current.focus();
    }
    isInitialMount.current = false;
  }, [value]);

  // Handle keyboard navigation in history list
  const handleHistoryKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLButtonElement;
    const currentIndex = searchHistory.indexOf(target.textContent || '');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % searchHistory.length;
      const nextItem = document.querySelector(
        `[data-index="${nextIndex}"]`
      ) as HTMLButtonElement | null;
      nextItem?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? searchHistory.length - 1 : currentIndex - 1;
      const prevItem = document.querySelector(
        `[data-index="${prevIndex}"]`
      ) as HTMLButtonElement | null;
      prevItem?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectHistoryItem(target.textContent || '');
    } else if (e.key === 'Escape') {
      closeHistory();
    }
  };

  const actualPlaceholder = placeholder || defaultPlaceholder;

  return (
    <div
      className={cn('relative flex items-center gap-2', className)}
      role="search"
      aria-label="Task search"
    >
      <div className="relative flex-1">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder={actualPlaceholder}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          className="pl-9 pr-9"
          aria-label={t('placeholder')}
          aria-autocomplete="list"
          aria-controls="search-history-list"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSearch}
            aria-label={t('clear')}
            type="button"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        {value.length === 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => inputRef.current?.focus()}
            aria-label={t('showHistory')}
            type="button"
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      <Popover open={showHistory} onOpenChange={setShowHistory} modal={false}>
        <PopoverTrigger>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            type="button"
            onClick={openHistory}
            aria-label={t('showHistory')}
            aria-expanded={showHistory}
          >
            <History className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            <span className="sr-only">{t('historyTitle')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-64"
          aria-label={t('historyTitle')}
        >
          <div className="space-y-1" role="listbox" aria-label={t('historyTitle')}>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-medium" aria-hidden="true">{t('historyTitle')}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleClearHistory}
                aria-label={t('clearHistory')}
                type="button"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
            {searchHistory.map((item, idx) => (
              <button
                key={item}
                ref={idx === 0 ? firstHistoryItemRef : undefined}
                data-index={idx}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => selectHistoryItem(item)}
                onKeyDown={handleHistoryKeyDown}
                role="option"
                aria-selected={value === item}
                tabIndex={0}
                aria-label={t('historyItem', { query: item })}
              >
                {item}
              </button>
            ))}
          </div>
          {searchHistory.length === 0 && (
            <div className="px-2 py-4 text-center text-muted-foreground text-sm">
              {t('noHistory')}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}