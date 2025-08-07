/**
 * Customer Duplicate Search API Endpoint
 * CMS-007: Core Customer API - Duplicate Detection
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { customerMappingService } from '@/lib/customer-mapping-service';

interface SearchDuplicatesRequest {
  fullName: string;
  primaryPhone?: string;
  email?: string;
  excludeCustomerId?: string;
}

// POST /api/customers/search-duplicates - Search for potential duplicate customers
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: SearchDuplicatesRequest = await request.json();

    if (!body.fullName) {
      return NextResponse.json(
        { error: "Full name is required for duplicate search" },
        { status: 400 }
      );
    }

    const potentialDuplicates = await customerMappingService.findPotentialDuplicates({
      phone: body.primaryPhone,
      customerName: body.fullName,
      email: body.email
    });

    // Filter out excluded customer if provided
    const filteredDuplicates = body.excludeCustomerId 
      ? potentialDuplicates.filter(duplicate => duplicate.id !== body.excludeCustomerId)
      : potentialDuplicates;

    // Only include high-confidence matches for UI warnings
    const highConfidenceDuplicates = filteredDuplicates.filter(duplicate => {
      // Include if exact phone match
      if (body.primaryPhone && duplicate.normalized_phone) {
        const normalizedInput = customerMappingService.normalizePhoneNumber(body.primaryPhone);
        if (normalizedInput === duplicate.normalized_phone) {
          return true;
        }
      }
      
      // Include if exact email match
      if (body.email && duplicate.email && 
          body.email.toLowerCase() === duplicate.email.toLowerCase()) {
        return true;
      }
      
      // Include if very high name similarity (>90%)
      if (duplicate.similarity && duplicate.similarity > 0.9) {
        return true;
      }
      
      return false;
    });

    // Format response with match reasons
    const duplicatesWithReasons = highConfidenceDuplicates.map(duplicate => {
      const matchReasons: string[] = [];
      
      if (body.primaryPhone && duplicate.normalized_phone) {
        const normalizedInput = customerMappingService.normalizePhoneNumber(body.primaryPhone);
        if (normalizedInput === duplicate.normalized_phone) {
          matchReasons.push('Phone number match');
        }
      }
      
      if (body.email && duplicate.email) {
        if (body.email.toLowerCase() === duplicate.email.toLowerCase()) {
          matchReasons.push('Email match');
        }
      }
      
      if (duplicate.similarity && duplicate.similarity > 0.7) {
        matchReasons.push(`Name similarity: ${Math.round(duplicate.similarity * 100)}%`);
      }

      return {
        customer: {
          id: duplicate.id,
          customer_code: duplicate.customer_code,
          customer_name: duplicate.customer_name,
          contact_number: duplicate.contact_number,
          email: duplicate.email,
          match_method: duplicate.match_method
        },
        matchScore: duplicate.similarity || 1.0,
        matchReasons: matchReasons
      };
    });

    return NextResponse.json({
      potentialDuplicates: duplicatesWithReasons,
      duplicateCount: duplicatesWithReasons.length,
      hasHighConfidenceMatches: duplicatesWithReasons.some(d => d.matchScore > 0.9)
    });

  } catch (error: any) {
    console.error('Error searching for duplicates:', error);
    return NextResponse.json(
      { error: "Failed to search for duplicates", details: error.message },
      { status: 500 }
    );
  }
}