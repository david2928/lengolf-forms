'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserCog } from 'lucide-react';
import Link from 'next/link';
import { WeeklyScheduleManager } from '@/components/coaching/availability/WeeklyScheduleManager';
import { RecurringBlocksManager } from '@/components/coaching/availability/RecurringBlocksManager';
import { DateOverridesManager } from '@/components/coaching/availability/DateOverridesManager';
import { AvailabilityCalendar } from '@/components/coaching/availability/AvailabilityCalendar';

// Simple Coach Selector Component (like coaching portal)
function CoachSelectorDropdown({ userInfo, selectedCoachId, onCoachSelection }: {
  userInfo: UserInfo | null;
  selectedCoachId: string;
  onCoachSelection: (coachId: string) => void;
}) {
  const [allCoaches, setAllCoaches] = useState<Coach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  // Get coaches list if not already available
  useEffect(() => {
    if (!userInfo?.availableCoaches || userInfo.availableCoaches.length === 0) {
      fetchAllCoaches();
    } else {
      setAllCoaches(userInfo.availableCoaches);
    }
  }, [userInfo]);

  const fetchAllCoaches = async () => {
    setLoadingCoaches(true);
    try {
      const response = await fetch('/api/coaching/dashboard');
      if (response.ok) {
        const data = await response.json();
        if (data.availableCoaches) {
          setAllCoaches(data.availableCoaches);
        }
      }
    } catch (error) {
      console.error('Error fetching coaches:', error);
    } finally {
      setLoadingCoaches(false);
    }
  };

  return (
    <div className="min-w-[200px]">
      <Select value={selectedCoachId} onValueChange={onCoachSelection}>
        <SelectTrigger>
          <SelectValue placeholder={loadingCoaches ? "Loading..." : "Choose a coach..."} />
        </SelectTrigger>
        <SelectContent>
          {allCoaches.map((coach) => (
            <SelectItem key={coach.id} value={coach.id}>
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{coach.coach_display_name || coach.coach_name}</span>
                <span className="text-sm text-gray-500 ml-2">{coach.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface Coach {
  id: string;
  coach_name: string;
  coach_display_name: string;
  email: string;
}

interface UserInfo {
  id?: string;
  email?: string;
  is_admin?: boolean;
  is_coach?: boolean;
  isAdminView?: boolean;
  requiresCoachSelection?: boolean;
  availableCoaches?: Coach[];
  selectedCoachId?: string;
  coach?: {
    id: string;
    name: string;
    display_name: string;
    email: string;
  };
}

export default function AvailabilityPage() {
  const searchParams = useSearchParams();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'schedule' | 'blocks' | 'overrides'>('calendar');
  
  // Get coach_id from URL parameters if coming from coaching dashboard
  const urlCoachId = searchParams.get('coach_id');

  // Fetch user info and coach list if admin
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        // Include coach_id in API call if provided in URL
        const apiUrl = urlCoachId 
          ? `/api/coaching/dashboard?coach_id=${urlCoachId}`
          : '/api/coaching/dashboard';
          
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          
          // Map currentUser properties to top level for easier access
          const enrichedData = {
            ...data,
            is_coach: data.currentUser?.isCoach || false,
            is_admin: data.currentUser?.isAdmin || false,
            id: data.currentUser?.id,
            email: data.currentUser?.email
          };
          
          setUserInfo(enrichedData);
          
          // Set selected coach ID from URL or from data
          if (urlCoachId) {
            setSelectedCoachId(urlCoachId);
          } else if (data.coach?.id && !data.requiresCoachSelection) {
            // Admin viewing a specific coach or coach viewing their own data
            setSelectedCoachId(data.coach.id);
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          // For debugging: try to get response text
          const errorText = await response.text();
          console.error('Error response:', errorText);
          // Set a default userInfo to prevent access denied
          setUserInfo({ 
            id: 'temp', 
            email: 'temp@temp.com', 
            is_admin: true, 
            is_coach: false,
            requiresCoachSelection: true,
            availableCoaches: []
          });
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserInfo();
  }, [urlCoachId]);

  const handleCoachSelection = (coachId: string) => {
    setSelectedCoachId(coachId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has access (either is a coach, admin, or has coach data)
  const hasAccess = userInfo && (
    userInfo.is_coach || 
    userInfo.is_admin || 
    userInfo.isAdminView ||
    userInfo.coach // Has coach data from API
  );
  
  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6 max-w-md text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-900 mb-2">Access Denied</h1>
          <p className="text-red-700 mb-4">
            This page is only available to coaches and administrators.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 mb-4">
              Debug: userInfo = {JSON.stringify(userInfo, null, 2)}
            </div>
          )}
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show coach selection for admins (always show for admins, not just when requiresCoachSelection)
  const isAdmin = userInfo?.is_admin || userInfo?.isAdminView;
  const showCoachSelector = isAdmin;
  const canManageAvailability = selectedCoachId || (!userInfo?.requiresCoachSelection && (userInfo?.is_coach || userInfo?.coach));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/coaching">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Manage Availability</h1>
        </div>
        
        {/* Coach Selector for Admins (top right) */}
        {showCoachSelector && (
          <CoachSelectorDropdown
            userInfo={userInfo}
            selectedCoachId={selectedCoachId}
            onCoachSelection={handleCoachSelection}
          />
        )}
      </div>

      {/* Show message if admin hasn't selected a coach */}
      {isAdmin && !selectedCoachId && (
        <div className="text-center py-12">
          <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Coach</h3>
          <p className="text-gray-600">Please select a coach from the dropdown above to manage their availability.</p>
        </div>
      )}

      {/* Main content - only show if coach is selected or user is a coach */}
      {canManageAvailability && (
        <>
          {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'calendar'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Calendar View
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'schedule'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Weekly Schedule
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'blocks'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Recurring Blocks
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'overrides'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Date Overrides
        </button>
      </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === 'calendar' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Availability Calendar</h2>
              <p className="text-gray-600 mb-6">
                Visual overview of {(userInfo?.is_admin || userInfo?.isAdminView) ? 'coach' : 'your'} complete availability including weekly schedule, recurring blocks, and date overrides.
              </p>
              <AvailabilityCalendar coachId={selectedCoachId} />
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Weekly Schedule Configuration</h2>
              <p className="text-gray-600 mb-6">
                Set {(userInfo?.is_admin || userInfo?.isAdminView) ? 'the coach\'s' : 'your'} regular availability for each day of the week. This forms the base schedule for coaching availability.
              </p>
              <WeeklyScheduleManager coachId={selectedCoachId} />
            </div>
          )}

          {activeTab === 'blocks' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Recurring Blocks</h2>
              <p className="text-gray-600 mb-6">
                Add recurring unavailable periods like staff meetings, lunch breaks, or other regular commitments that repeat weekly.
              </p>
              <RecurringBlocksManager coachId={selectedCoachId} />
            </div>
          )}

          {activeTab === 'overrides' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Date-Specific Overrides</h2>
              <p className="text-gray-600 mb-6">
                Override {(userInfo?.is_admin || userInfo?.isAdminView) ? 'the coach\'s' : 'your'} regular schedule for specific dates. Add appointments, vacation days, or special availability periods.
              </p>
              <DateOverridesManager coachId={selectedCoachId} />
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}