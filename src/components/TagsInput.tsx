'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag as TagIcon, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface TagsInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  showLabel?: boolean;
  placeholder?: string;
  suggestedTags?: string[]; // Optional array of suggested tags
}

export function TagsInput({
  tags = [], // Default to empty array if tags is undefined or null
  onTagsChange,
  disabled = false,
  showLabel = true,
  placeholder = 'Add a tag...',
  suggestedTags = []
}: TagsInputProps) {
  // Ensure tags is always an array
  const safeTags = Array.isArray(tags) ? tags : [];
  
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Combine existing tags with any provided suggested tags for autocomplete options
  const safeSuggestedTags = Array.isArray(suggestedTags) ? suggestedTags : [];
  const allPossibleTags = [...new Set([...safeTags, ...safeSuggestedTags])];
  
  useEffect(() => {
    // Filter suggestions based on input text
    if (tagInput.trim()) {
      const inputLower = tagInput.toLowerCase().trim();
      
      // Find all matching tags that aren't already selected
      const matches = allPossibleTags.filter(tag => {
        const tagLower = tag.toLowerCase();
        return tagLower.includes(inputLower) && !safeTags.includes(tag);
      });
      
      // Sort suggestions by relevance:
      // 1. Exact matches first
      // 2. Starts with input text
      // 3. Contains input text
      const sortedMatches = matches.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        
        // Exact matches first
        if (aLower === inputLower && bLower !== inputLower) return -1;
        if (bLower === inputLower && aLower !== inputLower) return 1;
        
        // Then tags that start with the input text
        if (aLower.startsWith(inputLower) && !bLower.startsWith(inputLower)) return -1;
        if (bLower.startsWith(inputLower) && !aLower.startsWith(inputLower)) return 1;
        
        // Then alphabetical order
        return aLower.localeCompare(bLower);
      });
      
      setSuggestions(sortedMatches);
      setShowSuggestions(sortedMatches.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      // When input is empty, set suggestions to all available tags
      // (limited to avoid overwhelming the user)
      const availableTags = allPossibleTags
        .filter(tag => !safeTags.includes(tag))
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .slice(0, 10); // Limit to 10 suggestions when empty
      
      setSuggestions(availableTags);
      setShowSuggestions(false); // Don't show automatically, only on focus
    }
  }, [tagInput, allPossibleTags, safeTags]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        inputRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddTag = (tagToAdd: string = tagInput.trim()) => {
    const trimmedTag = tagToAdd.trim();
    if (trimmedTag && !safeTags.includes(trimmedTag)) {
      // Validate tag - don't allow tags with characters that might cause issues
      const validTag = trimmedTag.replace(/[^\w\s-]/g, ''); // Remove special characters except dash
      if (validTag) {
        onTagsChange([...safeTags, validTag]);
        setTagInput('');
        setShowSuggestions(false);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(safeTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle selection navigation with arrow keys
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleAddTag(suggestions[selectedSuggestionIndex]);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Normal tag handling
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && tagInput === '' && safeTags.length > 0) {
      // Remove the last tag when backspace is pressed and input is empty
      const newTags = [...safeTags];
      newTags.pop();
      onTagsChange(newTags);
    }
  };

  return (
    <div className="space-y-3">
      {showLabel && <Label>Tags</Label>}
      
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-card">
        {safeTags.map((tag, index) => (
          <Badge 
            key={index}
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1.5 text-sm"
          >
            <TagIcon className="h-3 w-3 opacity-70" />
            <span>{tag}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1 rounded-full"
              onClick={() => handleRemoveTag(tag)}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove tag {tag}</span>
            </Button>
          </Badge>
        ))}
        
        <div className="flex-1 min-w-[150px] relative">
          <div className="flex items-center">
            <Input
              ref={inputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // Show suggestions on focus, even if input is empty
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className="border-0 shadow-none focus-visible:ring-0 px-0 py-0.5 min-h-8"
            />
            {tagInput.trim() && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => handleAddTag()}
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add tag</span>
              </Button>
            )}
          </div>
          
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md bg-popover border shadow-lg"
            >
              <ul className="py-1 text-sm">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion}
                    className={`px-3 py-1.5 cursor-pointer hover:bg-muted ${
                      index === selectedSuggestionIndex ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleAddTag(suggestion)}
                  >
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-3 w-3 opacity-70" />
                      <span>{suggestion}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 