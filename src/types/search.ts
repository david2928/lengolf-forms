// Search System TypeScript Types
// Comprehensive type definitions for the product search functionality

export interface SearchQuery {
  text: string;
  type: 'text' | 'voice' | 'barcode' | 'sku';
  language?: 'en' | 'th';
  fuzzy?: boolean;
  exact?: boolean;
}

export interface SearchIntent {
  type: 'product' | 'category' | 'brand' | 'nutritional' | 'price' | 'availability';
  confidence: number;
  entities: SearchEntity[];
}

export interface SearchEntity {
  type: 'product_name' | 'category' | 'brand' | 'price_range' | 'attribute';
  value: string;
  confidence: number;
  start: number;
  end: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'trending' | 'product' | 'category' | 'completion';
  score: number;
  metadata?: {
    productCount?: number;
    categoryId?: string;
    popularity?: number;
    lastSearched?: Date;
  };
}

export interface SearchCorrection {
  original: string;
  corrected: string;
  confidence: number;
  type: 'spelling' | 'synonym' | 'abbreviation';
}

export interface SearchFilter {
  key: string;
  value: any;
  type: 'equals' | 'range' | 'contains' | 'in' | 'exists';
  label: string;
  displayValue?: string;
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
  type: 'alphabetical' | 'numerical' | 'relevance' | 'popularity' | 'date';
}

export interface SearchHighlight {
  field: string;
  value: string;
  highlights: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface SearchResultItem {
  id: string;
  type: 'product' | 'category';
  data: any; // Product or Category data
  score: number;
  highlights: SearchHighlight[];
  explanation?: SearchScoreExplanation;
}

export interface SearchScoreExplanation {
  totalScore: number;
  factors: Array<{
    factor: string;
    score: number;
    weight: number;
    description: string;
  }>;
}

export interface SearchResults {
  items: SearchResultItem[];
  total: number;
  took: number; // milliseconds
  query: SearchQuery;
  filters: SearchFilter[];
  sort: SearchSort[];
  suggestions: SearchSuggestion[];
  corrections: SearchCorrection[];
  facets: SearchFacet[];
  pagination: SearchPagination;
  analytics: SearchAnalyticsData;
}

export interface SearchFacet {
  field: string;
  label: string;
  type: 'terms' | 'range' | 'histogram' | 'date_range';
  values: SearchFacetValue[];
  totalValues: number;
  otherCount?: number;
}

export interface SearchFacetValue {
  value: any;
  label: string;
  count: number;
  selected: boolean;
  range?: {
    from: any;
    to: any;
  };
}

export interface SearchPagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SearchAnalyticsData {
  searchId: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  query: SearchQuery;
  filters: SearchFilter[];
  results: {
    total: number;
    viewed: number;
    clicked: number;
  };
  performance: {
    queryTime: number;
    renderTime: number;
    totalTime: number;
  };
}

// Search History and Session Management
export interface SearchHistoryEntry {
  id: string;
  query: SearchQuery;
  filters: SearchFilter[];
  timestamp: Date;
  resultCount: number;
  clicked: boolean;
  converted: boolean; // Led to purchase
  sessionId: string;
}

export interface SearchSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  queries: SearchHistoryEntry[];
  totalQueries: number;
  totalResults: number;
  conversions: number;
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop';
    userAgent: string;
    screenResolution?: string;
  };
}

// Real-time Search Types
export interface SearchIndex {
  name: string;
  version: string;
  documents: number;
  size: number;
  lastUpdated: Date;
  fields: SearchIndexField[];
}

export interface SearchIndexField {
  name: string;
  type: 'text' | 'keyword' | 'number' | 'date' | 'boolean' | 'geo';
  searchable: boolean;
  facetable: boolean;
  sortable: boolean;
  highlighted: boolean;
  weight?: number;
  analyzer?: string;
}

export interface SearchIndexUpdate {
  operation: 'add' | 'update' | 'delete';
  documents: any[];
  timestamp: Date;
  source: string;
}

// Voice Search Types
export interface VoiceSearchConfig {
  enabled: boolean;
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export interface VoiceSearchResult {
  transcript: string;
  confidence: number;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  isFinal: boolean;
}

// Search Performance and Monitoring
export interface SearchPerformanceMetrics {
  queryTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
    max: number;
  };
  indexSize: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number; // queries per second
  concurrentUsers: number;
}

export interface SearchAlert {
  id: string;
  type: 'performance' | 'error' | 'capacity' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
}

// A/B Testing for Search
export interface SearchExperiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: SearchExperimentVariant[];
  metrics: SearchExperimentMetric[];
  startDate: Date;
  endDate?: Date;
  trafficAllocation: number; // percentage
}

export interface SearchExperimentVariant {
  id: string;
  name: string;
  configuration: {
    algorithm?: string;
    weights?: Record<string, number>;
    filters?: SearchFilter[];
    boost?: Record<string, number>;
  };
  trafficPercentage: number;
}

export interface SearchExperimentMetric {
  name: string;
  type: 'count' | 'rate' | 'average' | 'percentile';
  goal: 'increase' | 'decrease' | 'maintain';
  baseline: number;
  target?: number;
  significance: number;
}

// Search Quality and Relevance
export interface SearchQualityMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  mrr: number; // Mean Reciprocal Rank
  ndcg: number; // Normalized Discounted Cumulative Gain
  clickThroughRate: number;
  conversionRate: number;
  zeroResultRate: number;
}

export interface SearchRelevanceJudgment {
  queryId: string;
  documentId: string;
  relevance: 0 | 1 | 2 | 3; // 0=not relevant, 3=perfectly relevant
  judge: string;
  timestamp: Date;
  notes?: string;
}

// Search Configuration
export interface SearchEngineConfig {
  provider: 'elasticsearch' | 'algolia' | 'lucene' | 'custom';
  connection: {
    host: string;
    port: number;
    ssl: boolean;
    auth?: {
      username: string;
      password: string;
      apiKey?: string;
    };
  };
  indices: {
    products: string;
    categories: string;
    suggestions: string;
  };
  features: {
    fuzzySearch: boolean;
    autoComplete: boolean;
    spellCheck: boolean;
    synonyms: boolean;
    faceting: boolean;
    highlighting: boolean;
    analytics: boolean;
    voiceSearch: boolean;
  };
  performance: {
    timeout: number;
    maxResults: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
}

// Error Types for Search
export interface SearchError {
  code: string;
  message: string;
  type: 'validation' | 'query' | 'index' | 'network' | 'timeout' | 'unknown';
  query?: SearchQuery;
  filters?: SearchFilter[];
  stack?: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface SearchValidationError extends SearchError {
  field: string;
  value: any;
  constraint: string;
  suggestion?: string;
}

