/**
 * Note Tag Chips - Quick-select tags for booking notes
 * Renders toggleable pill chips that append/remove text from a notes field.
 * Promo tags (green) are independent multi-select.
 * Bay tags (blue) are mutually exclusive single-select.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface TagDefinition {
  label: string;
  text: string;
}

const PROMO_TAGS: TagDefinition[] = [
  { label: 'Using Free Hour', text: 'Using free hour from Buy 1 Get 1 promotion' },
  { label: 'Will Use Free Hour Later', text: 'Will use free hour later' },
];

const BAY_TAGS: TagDefinition[] = [
  { label: 'Bay 1', text: 'Requested Bay 1' },
  { label: 'AI Bay', text: 'Requested AI Bay' },
  { label: 'Bay 4', text: 'Requested Bay 4' },
  { label: 'Social Bay', text: 'Requested Social Bay' },
];

interface NoteTagChipsProps {
  notes: string;
  onChange: (notes: string) => void;
}

function isTagActive(notes: string, tagText: string): boolean {
  return notes.toLowerCase().includes(tagText.toLowerCase());
}

function removeTagText(notes: string, tagText: string): string {
  // Remove the tag text (case-insensitive) and clean up separators
  const escaped = tagText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Remove with leading separator ("; " or "\n")
  let result = notes.replace(new RegExp(`(;\\s*|\\n)${escaped}`, 'gi'), '');
  // Remove with trailing separator
  result = result.replace(new RegExp(`${escaped}(;\\s*|\\n)`, 'gi'), '');
  // Remove standalone
  result = result.replace(new RegExp(escaped, 'gi'), '');
  return result.trim();
}

function appendTagText(notes: string, tagText: string): string {
  if (!notes.trim()) return tagText;
  return `${notes.trim()}; ${tagText}`;
}

export function NoteTagChips({ notes, onChange }: NoteTagChipsProps) {
  const handlePromoToggle = (tag: TagDefinition) => {
    if (isTagActive(notes, tag.text)) {
      onChange(removeTagText(notes, tag.text));
    } else {
      onChange(appendTagText(notes, tag.text));
    }
  };

  const handleBayToggle = (tag: TagDefinition) => {
    if (isTagActive(notes, tag.text)) {
      // Deselect
      onChange(removeTagText(notes, tag.text));
    } else {
      // Remove any other bay tag first, then add this one
      let cleaned = notes;
      for (const bayTag of BAY_TAGS) {
        if (isTagActive(cleaned, bayTag.text)) {
          cleaned = removeTagText(cleaned, bayTag.text);
        }
      }
      onChange(appendTagText(cleaned, tag.text));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mb-1.5">
      {PROMO_TAGS.map((tag) => {
        const active = isTagActive(notes, tag.text);
        return (
          <button
            key={tag.label}
            type="button"
            onClick={() => handlePromoToggle(tag)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border',
              active
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
            )}
          >
            {tag.label}
          </button>
        );
      })}
      {BAY_TAGS.map((tag) => {
        const active = isTagActive(notes, tag.text);
        return (
          <button
            key={tag.label}
            type="button"
            onClick={() => handleBayToggle(tag)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border',
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
            )}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
