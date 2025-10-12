/**
 * Customer Mapping Service
 * CMS-006: Phone-first customer identification with fuzzy name matching
 * 
 * This service implements the core customer identification logic:
 * 1. Phone matching (normalized phone numbers)
 * 2. Fuzzy name matching (>90% similarity when phone fails)
 * 3. Email matching (last resort)
 */

import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export interface CustomerMatchData {
  phone?: string;
  customerName?: string;
  email?: string;
}

export interface CustomerMatch {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
  normalized_phone?: string;
  similarity?: number;
  match_method: 'phone' | 'name' | 'email';
}

export interface FuzzyNameMatch {
  customer: CustomerMatch;
  similarity: number;
}

export class CustomerMappingService {
  private supabase = refacSupabaseAdmin;

  /**
   * Find customer match using phone-first strategy with fuzzy name fallback
   */
  async findCustomerMatch(data: CustomerMatchData): Promise<CustomerMatch | null> {
    // Try phone match first (highest priority)
    if (data.phone) {
      const phoneMatch = await this.findByNormalizedPhone(data.phone);
      if (phoneMatch) {
        return { ...phoneMatch, match_method: 'phone' };
      }
    }

    // Fuzzy name matching only with very high confidence (>90%)
    if (data.customerName && !data.phone) {
      const nameMatches = await this.findByFuzzyName(data.customerName);
      // Only return if there's exactly one match with >90% similarity
      if (nameMatches.length === 1 && nameMatches[0].similarity > 0.9) {
        return { 
          ...nameMatches[0].customer, 
          similarity: nameMatches[0].similarity,
          match_method: 'name'
        };
      }
    }

    // Try email as last resort
    if (data.email) {
      const emailMatch = await this.findByEmail(data.email);
      if (emailMatch) {
        return { ...emailMatch, match_method: 'email' };
      }
    }

    return null;
  }

  /**
   * Find customer by normalized phone number (primary matching method)
   */
  async findByNormalizedPhone(phone: string): Promise<CustomerMatch | null> {
    // Normalize the input phone number
    const normalizedPhone = this.normalizePhoneNumber(phone);
    if (!normalizedPhone) return null;

    const { data, error } = await this.supabase
      .from('customers')
      .select('id, customer_code, customer_name, contact_number, email, normalized_phone')
      .eq('normalized_phone', normalizedPhone)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      customer_code: data.customer_code,
      customer_name: data.customer_name,
      contact_number: data.contact_number,
      email: data.email,
      normalized_phone: data.normalized_phone,
      match_method: 'phone'
    };
  }

  /**
   * Find customers by fuzzy name matching (secondary method)
   * Only returns matches with >90% similarity
   */
  async findByFuzzyName(customerName: string): Promise<FuzzyNameMatch[]> {
    // Use PostgreSQL similarity function for fuzzy matching
    const { data, error } = await this.supabase
      .rpc('find_customers_by_fuzzy_name', {
        search_name: customerName,
        min_similarity: 0.9
      });

    if (error || !data) return [];

    return data.map((row: any) => ({
      customer: {
        id: row.id,
        customer_code: row.customer_code,
        customer_name: row.customer_name,
        contact_number: row.contact_number,
        email: row.email,
        normalized_phone: row.normalized_phone,
        match_method: 'name' as const
      },
      similarity: row.similarity
    }));
  }

  /**
   * Find customer by email (tertiary method)
   */
  async findByEmail(email: string): Promise<CustomerMatch | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('id, customer_code, customer_name, contact_number, email, normalized_phone')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      customer_code: data.customer_code,
      customer_name: data.customer_name,
      contact_number: data.contact_number,
      email: data.email,
      normalized_phone: data.normalized_phone,
      match_method: 'email'
    };
  }

  /**
   * Search for potential duplicates before creating a new customer
   */
  async findPotentialDuplicates(data: CustomerMatchData): Promise<CustomerMatch[]> {
    const matches: CustomerMatch[] = [];

    // Phone matches
    if (data.phone) {
      const phoneMatch = await this.findByNormalizedPhone(data.phone);
      if (phoneMatch) {
        matches.push(phoneMatch);
      }
    }

    // Name matches (all results, not just high confidence)
    if (data.customerName) {
      const { data: nameResults, error } = await this.supabase
        .rpc('find_customers_by_fuzzy_name', {
          search_name: data.customerName,
          min_similarity: 0.7 // Lower threshold for duplicate detection
        });

      if (!error && nameResults) {
        nameResults.forEach((row: any) => {
          if (!matches.find(m => m.id === row.id)) {
            matches.push({
              id: row.id,
              customer_code: row.customer_code,
              customer_name: row.customer_name,
              contact_number: row.contact_number,
              email: row.email,
              normalized_phone: row.normalized_phone,
              similarity: row.similarity,
              match_method: 'name'
            });
          }
        });
      }
    }

    // Email matches
    if (data.email) {
      const emailMatch = await this.findByEmail(data.email);
      if (emailMatch && !matches.find(m => m.id === emailMatch.id)) {
        matches.push(emailMatch);
      }
    }

    return matches;
  }

  /**
   * Create a new customer from booking data
   */
  async createCustomerFromBooking(bookingData: {
    fullName: string;
    primaryPhone: string;
    email?: string;
    preferredContactMethod?: 'Phone' | 'LINE' | 'Email';
    notes?: string;
  }): Promise<CustomerMatch> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert({
        customer_name: bookingData.fullName,
        contact_number: bookingData.primaryPhone,
        email: bookingData.email,
        preferred_contact_method: bookingData.preferredContactMethod || 'Phone',
        notes: bookingData.notes || null
      })
      .select('id, customer_code, customer_name, contact_number, email, normalized_phone')
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    return {
      id: data.id,
      customer_code: data.customer_code,
      customer_name: data.customer_name,
      contact_number: data.contact_number,
      email: data.email,
      normalized_phone: data.normalized_phone,
      match_method: 'phone'
    };
  }

  /**
   * Normalize phone number for matching (client-side implementation)
   * Should match the database normalize_phone_number function
   */
  normalizePhoneNumber(phone: string): string | null {
    if (!phone || phone.trim() === '') return null;

    // Remove all non-digit characters
    let normalized = phone.replace(/[^0-9]/g, '');

    // Remove country code +66 (Thailand)
    if (normalized.length >= 11 && normalized.startsWith('66')) {
      normalized = normalized.substring(2);
    }

    // Remove leading 0 for local numbers
    if (normalized.length === 10 && normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }

    // Return last 9 digits for matching
    return normalized.slice(-9);
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;
    
    // Basic validation - should have at least 8 digits
    const normalized = this.normalizePhoneNumber(phone);
    return normalized !== null && normalized.length >= 8 && normalized.length <= 9;
  }
}

// Export singleton instance
export const customerMappingService = new CustomerMappingService();