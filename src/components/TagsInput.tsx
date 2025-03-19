'use client';

import { useState } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
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
}

export function TagsInput({
  tags,
  onTagsChange,
  disabled = false,
  showLabel = true,
  placeholder = 'Add a tag...'
}: TagsInputProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      onTagsChange([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      // Remove the last tag when backspace is pressed and input is empty
      const newTags = [...tags];
      newTags.pop();
      onTagsChange(newTags);
    }
  };

  return (
    <div className="space-y-3">
      {showLabel && <Label>Tags</Label>}
      
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
        {tags.map((tag, index) => (
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
        
        <div className="flex-1 min-w-[150px]">
          <div className="flex items-center">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
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
                onClick={handleAddTag}
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add tag</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Tags help you organize and find your files more easily
        </p>
      )}
    </div>
  );
} 