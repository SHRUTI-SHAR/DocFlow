import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CollaboratorPresence } from '@/types/collaboration';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (userId: string, userName: string) => void;
  collaborators: CollaboratorPresence[];
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxRows?: number;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

interface MentionSuggestion {
  user_id: string;
  user_name: string;
  user_email?: string;
  avatar_url?: string;
  color: string;
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onMention,
  collaborators,
  placeholder = 'Type @ to mention someone...',
  className = '',
  minRows = 2,
  maxRows = 6,
  autoFocus = false,
  onKeyDown,
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionStartRef = useRef<number>(-1);

  // Get filtered suggestions
  const suggestions: MentionSuggestion[] = collaborators
    .filter(c => {
      const searchTerm = mentionQuery.toLowerCase();
      return (
        (c.user_name?.toLowerCase().includes(searchTerm) ||
         c.user_email?.toLowerCase().includes(searchTerm))
      );
    })
    .map(c => ({
      user_id: c.user_id,
      user_name: c.user_name || c.user_email?.split('@')[0] || 'Unknown',
      user_email: c.user_email,
      avatar_url: c.avatar_url,
      color: c.color,
    }));

  // Handle text change and detect @ mentions
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    onChange(newValue);

    // Find @ symbol before cursor
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space or newline between @ and cursor (means mention is complete)
      if (!/\s/.test(textAfterAt)) {
        setMentionQuery(textAfterAt);
        mentionStartRef.current = lastAtIndex;
        setShowMentions(true);
        setSelectedIndex(0);

        // Calculate position for popover
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setMentionPosition({
            top: rect.bottom,
            left: rect.left,
          });
        }
        return;
      }
    }

    setShowMentions(false);
    mentionStartRef.current = -1;
  }, [onChange]);

  // Handle suggestion selection
  const selectSuggestion = useCallback((suggestion: MentionSuggestion) => {
    if (mentionStartRef.current === -1) return;

    const beforeMention = value.slice(0, mentionStartRef.current);
    const cursorPosition = textareaRef.current?.selectionStart || value.length;
    const afterMention = value.slice(cursorPosition);
    
    const newValue = `${beforeMention}@${suggestion.user_name} ${afterMention}`;
    onChange(newValue);
    onMention?.(suggestion.user_id, suggestion.user_name);
    
    setShowMentions(false);
    mentionStartRef.current = -1;

    // Focus and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + suggestion.user_name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, onChange, onMention]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showMentions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
          break;
        case 'Escape':
          setShowMentions(false);
          mentionStartRef.current = -1;
          break;
      }
    }
    
    onKeyDown?.(e);
  }, [showMentions, suggestions, selectedIndex, selectSuggestion, onKeyDown]);

  // Close mentions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`resize-none ${className}`}
        style={{ minHeight: `${minRows * 24}px`, maxHeight: `${maxRows * 24}px` }}
        autoFocus={autoFocus}
      />

      {showMentions && suggestions.length > 0 && (
        <div 
          className="absolute left-0 z-50 w-64 mt-1 bg-popover border rounded-md shadow-md"
          style={{ top: '100%' }}
        >
          <Command>
            <CommandList>
              <CommandGroup heading="Mention someone">
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={suggestion.user_id}
                    onSelect={() => selectSuggestion(suggestion)}
                    className={`flex items-center gap-2 cursor-pointer ${
                      index === selectedIndex ? 'bg-accent' : ''
                    }`}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={suggestion.avatar_url} />
                      <AvatarFallback
                        style={{ backgroundColor: suggestion.color }}
                        className="text-[10px] text-white"
                      >
                        {getInitials(suggestion.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{suggestion.user_name}</span>
                      {suggestion.user_email && (
                        <span className="text-xs text-muted-foreground">
                          {suggestion.user_email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};

export default MentionInput;
