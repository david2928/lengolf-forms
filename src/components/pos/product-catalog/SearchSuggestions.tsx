'use client';

import React from 'react';
import { Search, Clock, TrendingUp, Star } from 'lucide-react';

export interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSuggestionSelect: (suggestion: string) => void;
  selectedIndex?: number;
  className?: string;
}

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'trending' | 'product' | 'category';
  metadata?: {
    productCount?: number;
    popularity?: number;
    category?: string;
  };
}

const getSuggestionIcon = (type: SearchSuggestion['type']) => {
  switch (type) {
    case 'recent':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'trending':
      return <TrendingUp className="h-4 w-4 text-orange-500" />;
    case 'product':
      return <Search className="h-4 w-4 text-blue-500" />;
    case 'category':
      return <Star className="h-4 w-4 text-purple-500" />;
    default:
      return <Search className="h-4 w-4 text-gray-400" />;
  }
};

const getSuggestionLabel = (type: SearchSuggestion['type']) => {
  switch (type) {
    case 'recent':
      return 'Recent';
    case 'trending':
      return 'Trending';
    case 'product':
      return 'Product';
    case 'category':
      return 'Category';
    default:
      return '';
  }
};

const getSuggestionStyles = (type: SearchSuggestion['type'], isSelected: boolean) => {
  const baseStyles = "w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-150";
  
  if (isSelected) {
    return `${baseStyles} bg-indigo-50 text-indigo-700`;
  }

  switch (type) {
    case 'trending':
      return `${baseStyles} text-gray-700 hover:bg-orange-50`;
    case 'product':
      return `${baseStyles} text-gray-700 hover:bg-blue-50`;
    case 'category':
      return `${baseStyles} text-gray-700 hover:bg-purple-50`;
    default:
      return `${baseStyles} text-gray-700`;
  }
};

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  onSuggestionSelect,
  selectedIndex = -1,
  className = ''
}) => {
  if (suggestions.length === 0) {
    return null;
  }

  // Group suggestions by type
  const groupedSuggestions = suggestions.reduce((acc, suggestion, index) => {
    const type = suggestion.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push({ ...suggestion, originalIndex: index });
    return acc;
  }, {} as Record<string, Array<SearchSuggestion & { originalIndex: number }>>);

  // Define display order for groups
  const groupOrder: Array<SearchSuggestion['type']> = ['trending', 'recent', 'category', 'product'];

  return (
    <div className={`search-suggestions ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
        {groupOrder.map((groupType) => {
          const groupSuggestions = groupedSuggestions[groupType];
          if (!groupSuggestions || groupSuggestions.length === 0) return null;

          return (
            <div key={groupType}>
              {/* Group Header */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center space-x-2">
                {getSuggestionIcon(groupType)}
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {getSuggestionLabel(groupType)}
                </span>
                <span className="text-xs text-gray-500">
                  ({groupSuggestions.length})
                </span>
              </div>

              {/* Group Items */}
              <div>
                {groupSuggestions.map((suggestion) => (
                  <button
                    key={`${groupType}-${suggestion.originalIndex}`}
                    onClick={() => onSuggestionSelect(suggestion.text)}
                    className={getSuggestionStyles(groupType, selectedIndex === suggestion.originalIndex)}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getSuggestionIcon(groupType)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {suggestion.text}
                        </div>
                        
                        {/* Additional metadata */}
                        {suggestion.metadata && (
                          <div className="text-xs text-gray-500 mt-1">
                            {suggestion.metadata.category && (
                              <span>in {suggestion.metadata.category}</span>
                            )}
                            {suggestion.metadata.productCount !== undefined && (
                              <span>
                                {suggestion.metadata.category ? ' • ' : ''}
                                {suggestion.metadata.productCount} products
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Popularity indicator for trending items */}
                    {groupType === 'trending' && suggestion.metadata?.popularity && (
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {[...Array(Math.min(5, Math.floor(suggestion.metadata.popularity)))].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 h-4 bg-orange-400 rounded-full mr-0.5"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Type indicator */}
                    <div className="text-xs text-gray-400 ml-2">
                      {getSuggestionLabel(groupType)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* No suggestions message */}
        {Object.keys(groupedSuggestions).length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No suggestions available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for quick suggestions display
export interface QuickSuggestionsProps {
  suggestions: string[];
  onSuggestionSelect: (suggestion: string) => void;
  maxVisible?: number;
  className?: string;
}

export const QuickSuggestions: React.FC<QuickSuggestionsProps> = ({
  suggestions,
  onSuggestionSelect,
  maxVisible = 6,
  className = ''
}) => {
  if (suggestions.length === 0) return null;

  const visibleSuggestions = suggestions.slice(0, maxVisible);

  return (
    <div className={`quick-suggestions ${className}`}>
      <div className="flex flex-wrap gap-2">
        {visibleSuggestions.map((suggestion, index) => (
          <button
            key={`${suggestion}-${index}`}
            onClick={() => onSuggestionSelect(suggestion)}
            className="
              inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
              bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-150
              border border-gray-200 hover:border-gray-300
            "
          >
            <Search className="h-3 w-3 mr-1" />
            {suggestion}
          </button>
        ))}
        
        {suggestions.length > maxVisible && (
          <span className="inline-flex items-center px-3 py-1.5 text-sm text-gray-500">
            +{suggestions.length - maxVisible} more
          </span>
        )}
      </div>
    </div>
  );
};