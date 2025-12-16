import { useState, useEffect, useCallback } from 'react';
import type { AssignedStaff, ChannelType } from '../utils/chatTypes';

interface StaffMember extends AssignedStaff {
  isAdmin: boolean;
  isStaff: boolean;
}

/**
 * Hook for managing conversation assignments
 * Handles fetching staff list and assigning/unassigning conversations
 */
export function useConversationAssignment() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch staff list on mount
  const fetchStaffList = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/list');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch staff list');
      }

      setStaffList(data.staff || []);
    } catch (err) {
      console.error('Error fetching staff list:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch staff list');
    }
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  /**
   * Assign a conversation to a staff member
   * @param conversationId - The conversation ID
   * @param channelType - The channel type (line, website, instagram, etc.)
   * @param assignToEmail - The staff member's email (null to unassign)
   * @returns The assigned staff info or null
   */
  const assignConversation = useCallback(async (
    conversationId: string,
    channelType: ChannelType,
    assignToEmail: string | null
  ): Promise<AssignedStaff | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/conversations/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          channelType,
          assignToEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign conversation');
      }

      return data.assignedTo;
    } catch (err) {
      console.error('Error assigning conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Unassign a conversation (shortcut for assignConversation with null email)
   * @param conversationId - The conversation ID
   * @param channelType - The channel type
   */
  const unassignConversation = useCallback(async (
    conversationId: string,
    channelType: ChannelType
  ): Promise<AssignedStaff | null> => {
    return assignConversation(conversationId, channelType, null);
  }, [assignConversation]);

  return {
    staffList,
    assignConversation,
    unassignConversation,
    loading,
    error,
    refreshStaffList: fetchStaffList
  };
}
