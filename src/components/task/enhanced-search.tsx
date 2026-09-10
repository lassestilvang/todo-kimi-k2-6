'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface EnhancedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function EnhancedSearch({
  value,
  onChange,
  placeholder = 'Search tasks...',
  className,
}: EnhancedSearchProps) {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const saveToHistory = (query: string) => {
    if (!query.trim()) return;

    const newHistory = [
      query.trim(),
      ...searchHistory.filter(s => s !== query.trim()),
    ].slice(0, 10);

    setSearchHistory(newHistory);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskSearchHistory', JSON.stringify(newHistory));
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (newValue !== value && newValue.length > 2) {
      saveToHistory(newValue);
    }
  };

  const clearSearch = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value && searchHistory.length > 0) {
      e.preventDefault();
      setShowHistory(true);
    }
  };

  const selectHistoryItem = (item: string) => {
    onChange(item);
    setShowHistory(false);
    saveToHistory(item);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('taskSearchHistory');
    }
  };

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSearch}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        {value.length === 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => inputRef.current?.focus()}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {searchHistory.length > 0 && (
        <Popover open={showHistory} onOpenChange={setShowHistory}>
          <PopoverTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              type="button"
              onClick={() => setShowHistory(true)}
            >
              <History className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs" aria-hidden="true">{`<`}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium">Search History</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={clearHistory}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {searchHistory.map((item, idx) => (
                <button
                  key={idx}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted"
                  onClick={() => selectHistoryItem(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}