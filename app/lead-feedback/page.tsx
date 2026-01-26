'use client';

import { useState, useEffect, useCallback } from 'react';
import { Phone, Check, X, TrendingUp, TrendingDown, Minus, CalendarClock, CalendarOff, Loader2, ArrowRight, ArrowLeft, CalendarPlus, Users, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Utility function to format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0
  }).format(amount);
};
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { KPIMetrics } from '@/components/KPIMetrics';
import { QuickBookingModal } from '@/components/ob-sales/QuickBookingModal';

interface OBNotesFormData {
  reachable: 'yes' | 'no' | '';
  response: 'positive' | 'neutral' | 'negative' | '';
  timeline: string;
  followUp: 'yes' | 'no' | '';
  followUpDate: string; // YYYY-MM-DD format
  followUpDateType: '1week' | '2weeks' | 'custom' | ''; // Preset selection
  notes: string;
}

export default function LeadFeedbackPage() {
  const [loading, setLoading] = useState(true);

  // OB Sales queue state
  const [queueCount, setQueueCount] = useState(0);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [queueLoading, setQueueLoading] = useState(false);

  // OB Sales view management
  type OBSalesView = 'dashboard' | 'calling' | 'followups';
  const [obView, setObView] = useState<OBSalesView>('dashboard');
  const [followUpCustomers, setFollowUpCustomers] = useState<any[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Dashboard stats state - new format for OB Sales
  const [dashboardStats, setDashboardStats] = useState({
    calls: { today: 0, weekAvg: 0 },
    bookings: { today: 0, weekAvg: 0 },
    sales: { today: 0, weekAvg: 0 },
  });

  // Load queue metrics from new auto-generated queue
  const loadQueueMetrics = async () => {
    setQueueLoading(true);
    try {
      const response = await fetch('/api/ob-sales/queue/metrics');
      if (response.ok) {
        const data = await response.json();
        setQueueCount(data.queueCount || 0);
        setFollowUpCount(data.followUpCount || 0);
      } else {
        console.error('Failed to load queue metrics:', response.status);
        setQueueCount(0);
        setFollowUpCount(0);
      }
    } catch (error) {
      console.error('Error loading queue metrics:', error);
      setQueueCount(0);
      setFollowUpCount(0);
    } finally {
      setQueueLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/ob-sales/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDashboardStats(data.stats);
        }
      } else {
        console.error('Failed to load dashboard stats:', response.status);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  // Load follow-up customers from new API
  const loadFollowUpCustomers = useCallback(async () => {
    setFollowUpLoading(true);
    try {
      const response = await fetch('/api/ob-sales/followups?offset=0&limit=50');
      if (response.ok) {
        const data = await response.json();
        setFollowUpCustomers(data.customers || []);
      } else {
        console.error('Failed to load follow-up customers:', response.status);
        setFollowUpCustomers([]);
      }
    } catch (error) {
      console.error('Error loading follow-up customers:', error);
      setFollowUpCustomers([]);
    } finally {
      setFollowUpLoading(false);
    }
  }, []);


  // Initialize page - load queue metrics and stats
  useEffect(() => {
    loadQueueMetrics();
    loadDashboardStats();
    setLoading(false);
  }, []);

  // Load follow-ups when entering follow-ups view
  useEffect(() => {
    if (obView === 'followups') {
      loadFollowUpCustomers();
    }
  }, [obView, loadFollowUpCustomers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        {/* KPI Metrics with Queue Count */}
        <div className="relative">
          <KPIMetrics stats={dashboardStats} />
          {/* Queue count - subtle gray text with info tooltip */}
          <div className="flex items-center justify-center gap-1.5 -mt-2 mb-4">
            <p className="text-sm text-gray-400">
              {queueCount.toLocaleString()} customers in queue
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-3">
                  <p className="font-medium text-sm mb-2">How is this list generated?</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>&bull; Thai phone number required</li>
                    <li>&bull; No future confirmed bookings</li>
                    <li>&bull; No visits in last 90 days</li>
                    <li>&bull; No call attempts in the last 30 days</li>
                    <li>&bull; No negative interactions in the last 180 days</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* OB Sales Content */}
        <div className="space-y-4">
          {obView === 'dashboard' && (
            <OBDashboard
              queueCount={queueCount}
              followUpCount={followUpCount}
              onStartCalling={() => setObView('calling')}
              onViewFollowUps={() => setObView('followups')}
              onRefresh={() => {
                loadQueueMetrics();
                loadDashboardStats();
              }}
              loading={queueLoading}
            />
          )}

          {obView === 'calling' && (
            <OBCallingInterface
              onBackToDashboard={() => {
                setObView('dashboard');
                loadQueueMetrics(); // Refresh counts after calling session
              }}
              onStatsUpdate={loadDashboardStats}
            />
          )}

          {obView === 'followups' && (
            <OBFollowUps
              customers={followUpCustomers}
              loading={followUpLoading}
              onBackToDashboard={() => setObView('dashboard')}
              onRefresh={loadFollowUpCustomers}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// OB Sales Dashboard Component
interface OBDashboardProps {
  queueCount: number;
  followUpCount: number;
  onStartCalling: () => void;
  onViewFollowUps: () => void;
  onRefresh: () => void;
  loading: boolean;
}

function OBDashboard({ queueCount, followUpCount, onStartCalling, onViewFollowUps, onRefresh, loading }: OBDashboardProps) {
  return (
    <div className="space-y-4">
      <Card>
        {/* Mobile-optimized buttons */}
        <CardContent className="space-y-3 p-4">
          <Button
            variant="default"
            size="lg"
            className="w-full h-14 text-base"
            onClick={onStartCalling}
            disabled={queueCount === 0 || loading}
          >
            <Phone className="h-5 w-5 mr-3" />
            Start Calling ({queueCount})
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14 text-base"
            onClick={onViewFollowUps}
            disabled={followUpCount === 0}
          >
            <Users className="h-5 w-5 mr-3" />
            Follow-ups
            {followUpCount > 0 && (
              <span className="ml-3 bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full">
                {followUpCount}
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {queueCount === 0 && !loading && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No customers in calling queue</p>
            <p className="text-sm text-muted-foreground mb-4">
              Customers are automatically added to the queue based on their visit history and call records.
            </p>
            <Button onClick={onRefresh} variant="outline" className="w-full h-12">
              {loading ? 'Checking...' : 'Refresh Queue'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// OB Sales Calling Interface Component
interface OBCallingInterfaceProps {
  onBackToDashboard: () => void;
  onStatsUpdate: () => void;
}

function OBCallingInterface({ onBackToDashboard, onStatsUpdate }: OBCallingInterfaceProps) {
  // Progressive loading state
  const [customerQueue, setCustomerQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalIndex, setTotalIndex] = useState(0); // Global position in full queue
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Track first load
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);

  const [notesData, setNotesData] = useState<OBNotesFormData>({
    reachable: '',
    response: '',
    timeline: '',
    followUp: '',
    followUpDate: '',
    followUpDateType: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const currentCustomer = customerQueue[currentIndex];
  const progress = totalCustomers > 0 ? ((totalIndex + 1) / totalCustomers) * 100 : 0;

  // Load customers from new queue API
  const loadCustomers = useCallback(async (offset: number, limit: number = 10): Promise<{ customers: any[], hasMore: boolean, total: number }> => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ob-sales/queue?offset=${offset}&limit=${limit}`
      );

      if (response.ok) {
        const data = await response.json();
        return {
          customers: data.customers || [],
          hasMore: data.pagination?.hasMore || false,
          total: data.pagination?.total || 0
        };
      } else {
        console.error('Failed to load customers:', response.status);
        return { customers: [], hasMore: false, total: 0 };
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      return { customers: [], hasMore: false, total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize with first batch of customers
  useEffect(() => {
    if (customerQueue.length === 0 && initialLoading) {
      loadCustomers(0, 10).then(({ customers, hasMore, total }) => {
        setCustomerQueue(customers);
        setHasMoreCustomers(hasMore);
        setTotalCustomers(total);
        setCurrentIndex(0);
        setTotalIndex(0);
        setInitialLoading(false); // Mark initial load complete
      });
    }
  }, [customerQueue.length, loadCustomers, initialLoading]);

  // Pre-fetch next customers when getting close to end of queue
  useEffect(() => {
    const shouldPreFetch = currentIndex >= customerQueue.length - 3 && hasMoreCustomers && !loading;

    if (shouldPreFetch) {
      const nextOffset = totalIndex - currentIndex + customerQueue.length;
      loadCustomers(nextOffset, 10).then(({ customers, hasMore }) => {
        if (customers.length > 0) {
          setCustomerQueue(prev => [...prev, ...customers]);
          setHasMoreCustomers(hasMore);
        } else {
          setHasMoreCustomers(false);
        }
      });
    }
  }, [currentIndex, customerQueue.length, hasMoreCustomers, loading, totalIndex, loadCustomers]);

  // Validation states
  const isReachableSet = notesData.reachable !== '';
  const isFollowUpSet = notesData.followUp !== '';
  // Response is only required if reachable is 'yes'
  const isResponseValid = notesData.reachable === 'no' || (notesData.reachable === 'yes' && notesData.response !== '');
  // Follow-up date is required when follow-up is 'yes'
  const isFollowUpDateValid = notesData.followUp === 'no' || (notesData.followUp === 'yes' && notesData.followUpDate !== '');
  // Call notes are optional - not required for form validation
  const isFormValid = isReachableSet && isFollowUpSet && isResponseValid && isFollowUpDateValid;

  const resetForm = () => {
    setNotesData({
      reachable: '',
      response: '',
      timeline: '',
      followUp: '',
      followUpDate: '',
      followUpDateType: '',
      notes: ''
    });
  };

  // Helper function to calculate follow-up date
  const getFollowUpDate = (type: '1week' | '2weeks'): string => {
    const date = new Date();
    if (type === '1week') {
      date.setDate(date.getDate() + 7);
    } else if (type === '2weeks') {
      date.setDate(date.getDate() + 14);
    }
    return date.toISOString().split('T')[0];
  };

  // Handle follow-up date type selection
  const handleFollowUpDateType = (type: '1week' | '2weeks' | 'custom') => {
    if (type === 'custom') {
      setNotesData({ ...notesData, followUpDateType: 'custom', followUpDate: '' });
    } else {
      setNotesData({ ...notesData, followUpDateType: type, followUpDate: getFollowUpDate(type) });
    }
  };

  const advanceToNext = () => {
    // Move to next customer in queue
    if (currentIndex < customerQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTotalIndex(prev => prev + 1);
    } else if (hasMoreCustomers) {
      // If we're at the end of queue but more customers available, wait for pre-fetch
      setTotalIndex(prev => prev + 1);
      // The useEffect will handle loading more customers
    } else {
      // No more customers, return to dashboard
      setTimeout(() => {
        onBackToDashboard();
      }, 1500);
      return;
    }

    resetForm();
  };

  const handleSave = async () => {
    if (!isFormValid || !currentCustomer) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/marketing/ob-sales-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: currentCustomer.id,
          reachable: notesData.reachable === 'yes',
          response: notesData.response || null,
          timeline: notesData.timeline || null,
          follow_up_required: notesData.followUp === 'yes',
          follow_up_date: notesData.followUp === 'yes' ? notesData.followUpDate : null,
          notes: notesData.notes.trim() || 'No additional notes',
          call_date: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        onStatsUpdate();

        // Auto-advance to next customer
        setTimeout(() => {
          advanceToNext();
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error('Failed to save call notes:', errorData);
      }
    } catch (error) {
      console.error('Error saving call notes:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner during initial load
  if (initialLoading || (loading && customerQueue.length === 0)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading customers...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentCustomer) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No customers in queue</p>
          <Button onClick={onBackToDashboard} variant="outline">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="space-y-3">
        {/* Customer Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 space-y-3">
          {/* Name & Back Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-800 flex-1">{currentCustomer.customer_name}</h3>
            <Button variant="ghost" size="sm" onClick={onBackToDashboard} className="h-8 px-2 text-sm flex-shrink-0">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>

          {/* Phone */}
          <div>
            {currentCustomer.contact_number ? (
              <a
                href={`tel:${currentCustomer.contact_number}`}
                className="block w-full"
              >
                <Button variant="default" size="lg" className="w-full h-16 text-lg bg-green-600 hover:bg-green-700 border-green-600">
                  <Phone className="h-6 w-6 mr-3" />
                  {currentCustomer.contact_number}
                </Button>
              </a>
            ) : (
              <div className="w-full p-4 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
                No phone number
              </div>
            )}
          </div>

          {/* Package Status */}
          {currentCustomer.last_package_name && (
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-l-4 border-purple-500 shadow-sm">
              <div>
                <span className="text-sm font-bold text-purple-800">{currentCustomer.last_package_name}</span>
                <div className="text-xs text-gray-600">
                  {currentCustomer.last_package_type}
                  {currentCustomer.last_package_first_use_date ? (
                    <span className="text-green-600 font-medium"> • Used</span>
                  ) : (
                    <span className="text-orange-600 font-medium"> • Not Used</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {currentCustomer.active_packages > 0 && (
                  <div className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-green-200" title="Active Package" />
                )}
                {!currentCustomer.last_package_first_use_date && (
                  <div className="h-3 w-3 rounded-full bg-orange-500 ring-2 ring-orange-200" title="Not Activated" />
                )}
              </div>
            </div>
          )}

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-600 font-medium mb-1">Value</div>
              <div className="text-lg font-bold text-emerald-800">{formatCurrency(currentCustomer.lifetime_spending)}</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-600 font-medium mb-1">Visits</div>
              <div className="text-lg font-bold text-blue-800">{currentCustomer.total_bookings || 0}</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-600 font-medium mb-1">Last Visit</div>
              <div className="text-sm font-bold text-slate-800">
                {currentCustomer.last_visit_date ?
                  new Date(currentCustomer.last_visit_date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }).replace(/\//g, '/') : 'Never'}
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="space-y-4">
          {/* Reachable */}
          <div className="p-4 bg-white">
            <Label className="text-base font-semibold mb-4 block text-gray-800">
              Can you reach them?
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={notesData.reachable === 'yes' ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  "h-14 transition-all",
                  notesData.reachable === 'yes' ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : "hover:bg-green-50 hover:border-green-300"
                )}
                onClick={() => setNotesData({ ...notesData, reachable: 'yes' })}
              >
                <Check className="h-5 w-5 mr-2" />
                Yes
              </Button>
              <Button
                variant={notesData.reachable === 'no' ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  "h-14 transition-all",
                  notesData.reachable === 'no' ? "bg-red-600 hover:bg-red-700 text-white border-red-600" : "hover:bg-red-50 hover:border-red-300"
                )}
                onClick={() => setNotesData({ ...notesData, reachable: 'no' })}
              >
                <X className="h-5 w-5 mr-2" />
                No
              </Button>
            </div>
          </div>

        {/* Response - Only show if reachable */}
        {notesData.reachable === 'yes' && (
          <>
            <div className="p-4 bg-white">
              <Label className="text-base font-semibold mb-4 block text-gray-800">
                How did they respond?
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={notesData.response === 'positive' ? 'default' : 'outline'}
                  size="default"
                  className={cn(
                    "h-14 transition-all",
                    notesData.response === 'positive' ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : "hover:bg-green-50 hover:border-green-300"
                  )}
                  onClick={() => setNotesData({ ...notesData, response: 'positive' })}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Positive
                </Button>
                <Button
                  variant={notesData.response === 'neutral' ? 'default' : 'outline'}
                  size="default"
                  className={cn(
                    "h-14 transition-all",
                    notesData.response === 'neutral' ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : "hover:bg-blue-50 hover:border-blue-300"
                  )}
                  onClick={() => setNotesData({ ...notesData, response: 'neutral' })}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Neutral
                </Button>
                <Button
                  variant={notesData.response === 'negative' ? 'default' : 'outline'}
                  size="default"
                  className={cn(
                    "h-14 transition-all",
                    notesData.response === 'negative' ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-600" : "hover:bg-orange-50 hover:border-orange-300"
                  )}
                  onClick={() => setNotesData({ ...notesData, response: 'negative' })}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Negative
                </Button>
              </div>
            </div>

            {/* Make Booking Button - Shows when reachable */}
            <div className="p-4 bg-white">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-14 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                onClick={() => setShowBookingModal(true)}
              >
                <CalendarPlus className="h-5 w-5 mr-2" />
                Make Booking
              </Button>
            </div>
          </>
        )}

        {/* Follow-up Required */}
        <div className="p-4 bg-white">
            <Label className="text-base font-semibold mb-4 block text-gray-800">
              Do they need a follow-up?
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={notesData.followUp === 'yes' ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  "h-14 transition-all",
                  notesData.followUp === 'yes' ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600" : "hover:bg-amber-50 hover:border-amber-300"
                )}
                onClick={() => setNotesData({ ...notesData, followUp: 'yes', followUpDate: '', followUpDateType: '' })}
              >
                <CalendarClock className="h-5 w-5 mr-2" />
                Yes
              </Button>
              <Button
                variant={notesData.followUp === 'no' ? 'default' : 'outline'}
                size="lg"
                className={cn(
                  "h-14 transition-all",
                  notesData.followUp === 'no' ? "bg-gray-600 hover:bg-gray-700 text-white border-gray-600" : "hover:bg-gray-50 hover:border-gray-300"
                )}
                onClick={() => setNotesData({ ...notesData, followUp: 'no', followUpDate: '', followUpDateType: '' })}
              >
                <CalendarOff className="h-5 w-5 mr-2" />
                No
              </Button>
            </div>
          </div>

        {/* Follow-up Date Selection - Only show if follow-up is 'yes' */}
        {notesData.followUp === 'yes' && (
          <div className="p-4 bg-white">
            <Label className="text-base font-semibold mb-4 block text-gray-800">
              When should we follow up?
            </Label>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Button
                variant={notesData.followUpDateType === '1week' ? 'default' : 'outline'}
                size="default"
                className={cn(
                  "h-12 transition-all",
                  notesData.followUpDateType === '1week' ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600" : "hover:bg-amber-50 hover:border-amber-300"
                )}
                onClick={() => handleFollowUpDateType('1week')}
              >
                1 Week
              </Button>
              <Button
                variant={notesData.followUpDateType === '2weeks' ? 'default' : 'outline'}
                size="default"
                className={cn(
                  "h-12 transition-all",
                  notesData.followUpDateType === '2weeks' ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600" : "hover:bg-amber-50 hover:border-amber-300"
                )}
                onClick={() => handleFollowUpDateType('2weeks')}
              >
                2 Weeks
              </Button>
              <Button
                variant={notesData.followUpDateType === 'custom' ? 'default' : 'outline'}
                size="default"
                className={cn(
                  "h-12 transition-all",
                  notesData.followUpDateType === 'custom' ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600" : "hover:bg-amber-50 hover:border-amber-300"
                )}
                onClick={() => handleFollowUpDateType('custom')}
              >
                <CalendarPlus className="h-4 w-4 mr-1" />
                Custom
              </Button>
            </div>

            {/* Custom date picker */}
            {notesData.followUpDateType === 'custom' && (
              <input
                type="date"
                className="w-full p-4 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-50"
                value={notesData.followUpDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNotesData({ ...notesData, followUpDate: e.target.value })}
                style={{ fontSize: '16px' }}
              />
            )}

            {/* Show selected date */}
            {notesData.followUpDate && notesData.followUpDateType !== 'custom' && (
              <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Follow-up scheduled for: <span className="font-semibold">{new Date(notesData.followUpDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="p-4 bg-white">
            <Label className="text-base font-semibold mb-2 block text-gray-800">
              Call notes (optional)
              <span className="text-sm text-gray-500 ml-2 font-normal">
                {notesData.notes.length}/500 characters
              </span>
            </Label>
            <textarea
              className="w-full p-4 text-base border-2 border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              rows={4}
              placeholder="What happened during the call?"
              value={notesData.notes}
              onChange={(e) => setNotesData({ ...notesData, notes: e.target.value })}
              maxLength={500}
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="max-w-sm mx-auto">
          {/* Validation Indicators - Only show required fields */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isReachableSet ? "bg-green-500" : "bg-gray-300"
              )} />
              <span className="text-xs text-muted-foreground">Reached</span>
            </div>
            {/* Only show response indicator if reachable is 'yes' */}
            {notesData.reachable === 'yes' && (
              <div className="flex items-center gap-1">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  notesData.response ? "bg-green-500" : "bg-gray-300"
                )} />
                <span className="text-xs text-muted-foreground">Response</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isFollowUpSet && isFollowUpDateValid ? "bg-green-500" : "bg-gray-300"
              )} />
              <span className="text-xs text-muted-foreground">Follow-up</span>
            </div>
          </div>

          {/* Save Button */}
          <Button
            variant={isFormValid ? "default" : "secondary"}
            size="lg"
            className="w-full h-12"
            disabled={!isFormValid || isSubmitting}
            onClick={handleSave}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Save & Continue
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Booking Modal */}
      {currentCustomer && (
        <QuickBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          customer={{
            id: currentCustomer.id,
            name: currentCustomer.customer_name,
            phone: currentCustomer.contact_number || '',
          }}
          onSuccess={(bookingId) => {
            // Update notes to mention booking was made
            setNotesData(prev => ({
              ...prev,
              notes: prev.notes ? `${prev.notes}\nBooking created: ${bookingId}` : `Booking created: ${bookingId}`
            }));
          }}
        />
      )}
    </div>
  );
}

// OB Sales Follow-ups Component
interface OBFollowUpsProps {
  customers: any[];
  loading: boolean;
  onBackToDashboard: () => void;
  onRefresh: () => void;
}

function OBFollowUps({ customers, loading, onBackToDashboard, onRefresh }: OBFollowUpsProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading follow-ups...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBackToDashboard}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">
              Follow-ups
              {customers.length > 0 && (
                <span className="ml-2 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                  {customers.length}
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>

        {customers.length === 0 ? (
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No follow-ups scheduled</p>
            <Button onClick={onRefresh} variant="outline">
              Refresh
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {customers.map((customer, index) => (
                <div key={customer.id || index} className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{customer.customer_name || 'Unknown Customer'}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.follow_up_date ? (
                          <>Follow-up: {new Date(customer.follow_up_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        ) : customer.last_call_date ? (
                          <>Last call: {new Date(customer.last_call_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        ) : (
                          'No date'
                        )}
                        {customer.last_call_response && ` • ${customer.last_call_response}`}
                      </p>
                      {customer.last_call_notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          &ldquo;{customer.last_call_notes}&rdquo;
                        </p>
                      )}
                      {/* Customer value info */}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Value: {formatCurrency(customer.lifetime_spending)}</span>
                        <span>Visits: {customer.total_bookings || 0}</span>
                      </div>
                    </div>
                    {customer.contact_number && (
                      <a href={`tel:${customer.contact_number}`}>
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
