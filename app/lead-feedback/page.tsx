'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Phone, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Clock, Target, Users, Check, X, TrendingUp, TrendingDown, Minus, CalendarClock, CalendarOff, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Lead {
  id: string;
  full_name?: string;
  phone_number?: string;
  email?: string;
  meta_submitted_at: string;
  display_name?: string;
  needs_followup?: boolean;
  group_size?: string;
  preferred_time?: string;
  planned_visit?: string;
  additional_inquiries?: string;
  is_opened: boolean;
  is_followup?: boolean;
  source: string;
  time_waiting_minutes: number;
  speed_to_lead_formatted?: string;
}

interface FeedbackFormData {
  was_reachable: boolean;
  response_type?: 'very_interested' | 'interested_need_time' | 'not_interested' | 'no_clear_answer';
  visit_timeline?: 'within_1_week' | 'within_month' | 'no_plan';
  requires_followup: boolean;
  booking_submitted: boolean;
  comments: string;
}

export default function LeadFeedbackPage() {
  const [activeTab, setActiveTab] = useState<'new-leads' | 'ob-sales'>('new-leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [openingLead, setOpeningLead] = useState<string | null>(null);
  
  // OB Sales state
  const [obAudience, setObAudience] = useState<any[]>([]);
  const [obAudienceInfo, setObAudienceInfo] = useState<any>(null);
  const [currentCustomerIndex, setCurrentCustomerIndex] = useState(0);
  const [obLoading, setObLoading] = useState(false);
  
  // OB Sales view management
  type OBSalesView = 'dashboard' | 'calling' | 'followups';
  const [obView, setObView] = useState<OBSalesView>('dashboard');
  const [followUpCustomers, setFollowUpCustomers] = useState<any[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  
  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState({
    speedToLead: '2.3h',
    weekAverage: '4.1h',
    monthAverage: '3.8h',
    obCalls: 12,
    sales: 3
  });
  
  const [formData, setFormData] = useState<FeedbackFormData>({
    was_reachable: true,
    response_type: undefined,
    visit_timeline: undefined,
    requires_followup: false,
    booking_submitted: false,
    comments: ''
  });

  const fetchLeadsWithoutFeedback = async () => {
    try {
      const response = await fetch('/api/leads/unfeedback');
      const data = await response.json();
      
      if (data.success) {
        setLeads(data.data);
        setFilteredLeads(data.data);
      } else {
        setErrorMessage('Failed to fetch leads');
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setErrorMessage('Error loading leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLead) {
      setErrorMessage('Please select a lead');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/leads/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          call_date: format(new Date(), 'yyyy-MM-dd'),
          ...formData
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`Feedback submitted for ${selectedLead.display_name}`);
        
        // Reset form
        setSelectedLead(null);
        setFormData({
          was_reachable: true,
          response_type: undefined,
          visit_timeline: undefined,
          requires_followup: false,
          booking_submitted: false,
          comments: ''
        });
        
        // Refresh leads list
        await fetchLeadsWithoutFeedback();
      } else {
        setErrorMessage(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setErrorMessage('Error submitting feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const loadSelectedAudience = async () => {
    setObLoading(true);
    try {
      const response = await fetch('/api/marketing/selected-audience/data');
      if (response.ok) {
        const data = await response.json();
        setObAudience(data.customers || []);
        setObAudienceInfo(data);
        setCurrentCustomerIndex(0);
      } else {
        console.error('Failed to load selected audience:', response.status);
        setObAudience([]);
        setObAudienceInfo(null);
        setCurrentCustomerIndex(0);
      }
    } catch (error) {
      console.error('Error loading audience:', error);
      setObAudience([]);
      setObAudienceInfo(null);
      setCurrentCustomerIndex(0);
    } finally {
      setObLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data.stats);
      } else {
        console.error('Failed to load dashboard stats:', response.status);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadFollowUpCustomers = async () => {
    if (!obAudienceInfo?.audienceId) return;
    
    setFollowUpLoading(true);
    try {
      const response = await fetch(`/api/marketing/ob-sales-notes?follow_up_required=true&audience_id=${obAudienceInfo.audienceId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowUpCustomers(data.data || []);
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
  };

  const handleOpenLead = async (leadId: string) => {
    setOpeningLead(leadId);
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/leads/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh leads list to show the newly opened lead
        await fetchLeadsWithoutFeedback();
        // Refresh dashboard stats
        await loadDashboardStats();
        setSuccessMessage(`Lead opened! Response time: ${data.speed_to_lead_formatted}`);
        
        // Auto-select the opened lead for feedback using the returned lead details
        const openedLeadData = {
          ...data.lead_details,
          is_opened: true,
          is_followup: false,
          needs_followup: false,
          time_waiting_minutes: 0,
          speed_to_lead_formatted: data.speed_to_lead_formatted,
          source: data.lead_details.form_type || 'Unknown'
        };
        setSelectedLead(openedLeadData);
      } else {
        setErrorMessage(data.error || 'Failed to open lead');
      }
    } catch (error) {
      console.error('Error opening lead:', error);
      setErrorMessage('Error opening lead');
    } finally {
      setOpeningLead(null);
    }
  };

  const getTimeBasedColor = (minutes: number): string => {
    if (minutes <= 10) return "bg-green-50 border-green-200";
    if (minutes <= 20) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getLeadClassName = (lead: Lead, selectedLead: Lead | null): string => {
    const baseClass = "p-4 md:p-3 border-b border-gray-100 cursor-pointer transition-all duration-300";
    const isSelected = selectedLead?.id === lead.id;
    
    if (isSelected) {
      return cn(baseClass, 'bg-blue-100 border-l-4 border-l-blue-500 border-blue-300 shadow-lg scale-[1.02] ring-2 ring-blue-200');
    }
    
    if (lead.is_followup) {
      return cn(baseClass, 'bg-orange-50 border-orange-200 hover:bg-gray-50');
    }
    
    if (lead.is_opened) {
      return cn(baseClass, 'bg-blue-50 border-blue-200 hover:bg-gray-50');
    }
    
    return cn(baseClass, 'hover:bg-gray-50');
  };

  const formatDistanceToNow = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  // All useEffect hooks must come before any early returns
  useEffect(() => {
    fetchLeadsWithoutFeedback();
    loadDashboardStats();
  }, []);

  useEffect(() => {
    const searchLower = searchTerm.toLowerCase();
    const filtered = leads.filter(lead => {
      if (!lead.is_opened && !lead.is_followup) {
        return lead.source.toLowerCase().includes(searchLower);
      }
      
      return [
        lead.display_name,
        lead.phone_number,
        lead.email,
        lead.full_name
      ].some(field => field?.toLowerCase().includes(searchLower));
    });
    setFilteredLeads(filtered);
  }, [searchTerm, leads]);

  useEffect(() => {
    if (activeTab === 'ob-sales') {
      loadSelectedAudience();
      loadFollowUpCustomers();
    }
  }, [activeTab, obAudienceInfo?.audienceId]);

  // Removed auto-reload functionality - users can manually refresh if needed

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          {/* Only show tabs when in dashboard views */}
          {(activeTab !== 'ob-sales' || obView === 'dashboard') && (
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="new-leads" className="text-base font-medium">New Leads</TabsTrigger>
              <TabsTrigger value="ob-sales" className="text-base font-medium">OB Sales</TabsTrigger>
            </TabsList>
          )}

        <TabsContent value="new-leads" className="space-y-4">

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4 flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              {errorMessage}
            </div>
          )}

          {/* Lead Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Lead</CardTitle>
            </CardHeader>
            <CardContent>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-3 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Leads List */}
        <div className="max-h-80 md:max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredLeads.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No leads found</p>
          ) : (
            filteredLeads.map((lead) => {
              // Concealed lead (not opened yet)
              if (!lead.is_opened && !lead.is_followup) {
                return (
                  <div
                    key={lead.id}
                    className={cn(
                      "p-4 md:p-3 border-b border-gray-100 transition-all duration-200",
                      getTimeBasedColor(lead.time_waiting_minutes),
                      "hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            New lead from {lead.source}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Submitted {formatDistanceToNow(new Date(lead.meta_submitted_at))} ago
                        </p>
                      </div>
                      <Button 
                        onClick={() => handleOpenLead(lead.id)}
                        disabled={openingLead === lead.id}
                        size="sm"
                        className="shrink-0"
                      >
                        {openingLead === lead.id ? 'Opening...' : 'Open Lead'}
                      </Button>
                    </div>
                  </div>
                );
              }

              // Revealed lead (opened or follow-up)
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={getLeadClassName(lead, selectedLead)}
                >
                  <div className="space-y-3">
                    {/* Speed to Lead Metric or Follow-up Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {lead.speed_to_lead_formatted && !lead.is_followup && (
                          <span className="text-sm font-medium text-blue-700">
                            Opened in {lead.speed_to_lead_formatted}
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {lead.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedLead?.id === lead.id && (
                          <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full flex-shrink-0 font-medium animate-pulse">
                            ✓ Working On
                          </span>
                        )}
                        {lead.needs_followup && (
                          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full flex-shrink-0">
                            Follow-up
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Lead Details */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-base md:text-sm truncate">{lead.display_name}</p>
                        </div>
                        <p className="text-sm md:text-xs text-gray-600 truncate">{lead.email || 'No email'}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(lead.meta_submitted_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Phone className="h-5 w-5 text-gray-400 ml-3 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Lead Details */}
        {selectedLead && selectedLead.is_opened && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2 text-base md:text-sm">Lead Details</h3>
            {selectedLead.speed_to_lead_formatted && !selectedLead.is_followup && (
              <div className="mb-3 p-2 bg-blue-100 text-blue-800 rounded text-sm">
                ⏱️ Response time: {selectedLead.speed_to_lead_formatted}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm md:text-xs">
              <p><span className="font-medium">Name:</span> {selectedLead.full_name}</p>
              <p><span className="font-medium">Phone:</span> {selectedLead.phone_number}</p>
              <p><span className="font-medium">Source:</span> {selectedLead.source}</p>
              {selectedLead.group_size && (
                <p><span className="font-medium">Group Size:</span> {selectedLead.group_size}</p>
              )}
              {selectedLead.preferred_time && (
                <p><span className="font-medium">Preferred Time:</span> {selectedLead.preferred_time}</p>
              )}
              {selectedLead.planned_visit && (
                <p className="md:col-span-2"><span className="font-medium">Planned Visit:</span> {selectedLead.planned_visit}</p>
              )}
              {selectedLead.additional_inquiries && (
                <p className="md:col-span-2"><span className="font-medium">Inquiries:</span> {selectedLead.additional_inquiries}</p>
              )}
            </div>
          </div>
        )}

        {/* Message for concealed leads */}
        {selectedLead && !selectedLead.is_opened && !selectedLead.is_followup && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              🔒 Lead details are concealed. Click Open Lead to reveal information and start the feedback process.
            </p>
          </div>
        )}
            </CardContent>
          </Card>

          {/* Feedback Form */}
          {selectedLead && selectedLead.is_opened && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="bg-blue-100">
                <CardTitle className="text-lg text-blue-900">📞 Call Outcome - Complete the feedback form below</CardTitle>
                <p className="text-sm text-blue-700 mt-1">Record the result of your call with {selectedLead.full_name}</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Was Reachable */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">
                      Was the customer reachable? <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="reachable"
                          checked={formData.was_reachable === true}
                          onChange={() => setFormData({ ...formData, was_reachable: true })}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="reachable"
                          checked={formData.was_reachable === false}
                          onChange={() => setFormData({ ...formData, was_reachable: false })}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  </div>

                  {/* Response Type - Only show if reachable */}
                  {formData.was_reachable && (
                    <>
                      <div>
                        <Label className="text-sm font-medium mb-3 block">
                          How did the customer respond to the call? <span className="text-red-500">*</span>
                        </Label>
                        <Select 
                          value={formData.response_type || ''} 
                          onValueChange={(value) => setFormData({ ...formData, response_type: value as FeedbackFormData['response_type'] })}
                          required={formData.was_reachable}
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select response..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="very_interested">Very interested</SelectItem>
                            <SelectItem value="interested_need_time">Interested but need more time</SelectItem>
                            <SelectItem value="not_interested">Not interested</SelectItem>
                            <SelectItem value="no_clear_answer">No clear answer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-3 block">
                          When is the customer planning to visit LENGOLF?
                        </Label>
                        <Select 
                          value={formData.visit_timeline || ''} 
                          onValueChange={(value) => setFormData({ ...formData, visit_timeline: value as FeedbackFormData['visit_timeline'] })}
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select timeline..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="within_1_week">Within 1 week</SelectItem>
                            <SelectItem value="within_month">Within this month</SelectItem>
                            <SelectItem value="no_plan">No plan yet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Follow-up Required */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">
                      Does this lead require a follow-up? <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="followup"
                          checked={formData.requires_followup === true}
                          onChange={() => setFormData({ ...formData, requires_followup: true })}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="followup"
                          checked={formData.requires_followup === false}
                          onChange={() => setFormData({ ...formData, requires_followup: false })}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  </div>

                  {/* Booking Submitted - Only show if reachable */}
                  {formData.was_reachable && (
                    <div>
                      <Label className="text-sm font-medium mb-3 block">
                        Was the lead successfully closed and booking submitted? <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="booking"
                            checked={formData.booking_submitted === true}
                            onChange={() => setFormData({ ...formData, booking_submitted: true })}
                            className="mr-2 w-4 h-4"
                          />
                          <span className="text-sm">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="booking"
                            checked={formData.booking_submitted === false}
                            onChange={() => setFormData({ ...formData, booking_submitted: false })}
                            className="mr-2 w-4 h-4"
                          />
                          <span className="text-sm">No</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">
                      Additional Comments (optional):
                    </Label>
                    <textarea
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                      rows={4}
                      className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Enter any additional notes about the call..."
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 text-sm font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* OB Sales Tab */}
        <TabsContent value="ob-sales" className="space-y-4">
          {obView === 'dashboard' && (
            <OBDashboard
              stats={dashboardStats}
              audienceCount={obAudience.length}
              followUpCount={followUpCustomers.length}
              onStartCalling={() => setObView('calling')}
              onViewFollowUps={() => setObView('followups')}
              onRefresh={loadSelectedAudience}
              loading={obLoading}
            />
          )}
          
          {obView === 'calling' && (
            <OBCallingInterface
              audience={obAudience}
              currentIndex={currentCustomerIndex}
              onIndexChange={setCurrentCustomerIndex}
              onBackToDashboard={() => setObView('dashboard')}
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
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// OB Sales Dashboard Component
interface OBDashboardProps {
  stats: {
    speedToLead: string;
    weekAverage: string;
    monthAverage: string;
    obCalls: number;
    sales: number;
  };
  audienceCount: number;
  followUpCount: number;
  onStartCalling: () => void;
  onViewFollowUps: () => void;
  onRefresh: () => void;
  loading: boolean;
}

function OBDashboard({ stats, audienceCount, followUpCount, onStartCalling, onViewFollowUps, onRefresh, loading }: OBDashboardProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-muted-foreground">
            Today's Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-secondary rounded-lg">
            <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats.speedToLead}</div>
            <div className="text-xs text-muted-foreground">Speed</div>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg">
            <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats.weekAverage}</div>
            <div className="text-xs text-muted-foreground">Week Avg</div>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats.obCalls}</div>
            <div className="text-xs text-muted-foreground">OB Calls</div>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg">
            <Target className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats.sales}</div>
            <div className="text-xs text-muted-foreground">Sales</div>
          </div>
        </CardContent>
        
        {/* Mobile-optimized buttons at bottom */}
        <CardContent className="space-y-3 pt-0">
          <Button 
            variant="default" 
            size="lg" 
            className="w-full h-14 text-base"
            onClick={onStartCalling}
            disabled={audienceCount === 0 || loading}
          >
            <Phone className="h-5 w-5 mr-3" />
            Start Calling ({audienceCount})
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
      
      {audienceCount === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No audience selected</p>
            <p className="text-sm text-muted-foreground mb-4">
              Go to the Marketing page and select an audience to display here.
            </p>
            <Button onClick={onRefresh} variant="outline" className="w-full h-12">
              {loading ? 'Checking...' : 'Check for Selected Audience'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// OB Sales Calling Interface Component
interface OBCallingInterfaceProps {
  audience: any[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onBackToDashboard: () => void;
  onStatsUpdate: () => void;
}

function OBCallingInterface({ audience, currentIndex, onIndexChange, onBackToDashboard, onStatsUpdate }: OBCallingInterfaceProps) {
  const [notesData, setNotesData] = useState<OBNotesFormData>({
    reachable: '',
    response: '',
    timeline: '',
    followUp: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCustomer = audience[currentIndex];
  const progress = ((currentIndex + 1) / audience.length) * 100;
  
  // Validation states
  const isReachableSet = notesData.reachable !== '';
  const isFollowUpSet = notesData.followUp !== '';
  const hasNotes = notesData.notes.trim().length > 0;
  // Response is only required if reachable is 'yes'
  const isResponseValid = notesData.reachable === 'no' || (notesData.reachable === 'yes' && notesData.response !== '');
  // Call notes are optional - not required for form validation
  const isFormValid = isReachableSet && isFollowUpSet && isResponseValid;

  const resetForm = () => {
    setNotesData({
      reachable: '',
      response: '',
      timeline: '',
      followUp: '',
      notes: ''
    });
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
          notes: notesData.notes.trim() || 'No additional notes',
          call_date: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        onStatsUpdate();
        
        // Auto-advance to next customer or return to dashboard
        if (currentIndex < audience.length - 1) {
          setTimeout(() => {
            onIndexChange(currentIndex + 1);
            resetForm();
          }, 1000);
        } else {
          setTimeout(() => {
            onBackToDashboard();
          }, 1500);
        }
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

  if (!currentCustomer) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No customers in audience</p>
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
                onClick={() => setNotesData({ ...notesData, followUp: 'yes' })}
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
                onClick={() => setNotesData({ ...notesData, followUp: 'no' })}
              >
                <CalendarOff className="h-5 w-5 mr-2" />
                No
              </Button>
            </div>
          </div>

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
                isFollowUpSet ? "bg-green-500" : "bg-gray-300"
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
              {customers.map((item, index) => (
                <div key={index} className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.customer_name || 'Unknown Customer'}</p>
                      <p className="text-sm text-muted-foreground">
                        Last call: {new Date(item.created_at).toLocaleDateString()} • {item.response || 'No response recorded'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        "{item.notes}"
                      </p>
                    </div>
                    {item.customer_phone && (
                      <a href={`tel:${item.customer_phone}`}>
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

// Original OB Sales Tab Component (Legacy - will be replaced)
interface OBSalesTabProps {
  audience: any[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  loading: boolean;
  onReload: () => void;
  onStatsUpdate: () => void;
}

interface OBNotesFormData {
  reachable: 'yes' | 'no' | '';
  response: 'positive' | 'neutral' | 'negative' | '';
  timeline: string;
  followUp: 'yes' | 'no' | '';
  notes: string;
}

function OBSalesTab({ audience, currentIndex, onIndexChange, loading, onReload, onStatsUpdate }: OBSalesTabProps) {
  const [notesData, setNotesData] = useState<OBNotesFormData>({
    reachable: '',
    response: '',
    timeline: '',
    followUp: '',
    notes: ''
  });
  const [logs, setLogs] = useState<Array<{
    id: string;
    timestamp: string;
    summary: string;
    details: string;
  }>>([]);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [customerNotesStatus, setCustomerNotesStatus] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCustomer = audience[currentIndex];
  const canLog = notesData.notes.trim().length > 0;
  const hasNotesForCurrentCustomer = currentCustomer ? customerNotesStatus[currentCustomer.id] || false : false;
  
  // Validation states
  const isReachableSet = notesData.reachable !== '';
  const isFollowUpSet = notesData.followUp !== '';
  const hasNotes = notesData.notes.trim().length > 0;
  const isFormValid = isReachableSet && isFollowUpSet && hasNotes;

  const autoAdvanceToNext = () => {
    if (currentIndex < audience.length - 1) {
      setTimeout(() => {
        onIndexChange(currentIndex + 1);
        resetForm();
        setHasUnsavedNotes(false);
      }, 1000); // 1 second delay to show success
    }
  };

  const resetForm = () => {
    setNotesData({
      reachable: '',
      response: '',
      timeline: '',
      followUp: '',
      notes: ''
    });
  };

  const handleLog = async (createBooking: boolean) => {
    if (!isFormValid || !currentCustomer) return;
    
    setIsSubmitting(true);
    
    try {
      // Save to database
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
          notes: notesData.notes.trim(),
          call_date: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        // Mark this customer as having saved notes
        setCustomerNotesStatus(prev => ({
          ...prev,
          [currentCustomer.id]: true
        }));
        
        setLogs(prev => [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleString(),
            summary: `${currentCustomer.customer_name}: ${notesData.reachable === 'yes' ? 'connected' : 'not reachable'}${createBooking ? ' · booking follow-up' : ''}`,
            details: notesData.notes.trim(),
          },
          ...prev,
        ]);
        
        setHasUnsavedNotes(false);
        
        // Update dashboard statistics
        onStatsUpdate();
        
        // Auto-advance to next customer
        autoAdvanceToNext();
        
        if (createBooking) {
          // Future: Implement booking navigation
        }
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading audience...</p>
        </CardContent>
      </Card>
    );
  }

  if (audience.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600 mb-4">No audience selected</p>
          <p className="text-sm text-gray-500 mb-4">
            Go to the Marketing page and select an audience to display here.
          </p>
          <Button onClick={onReload} variant="outline">
            Check for Selected Audience
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-24"> {/* Added bottom padding for sticky bar */}
      {/* Progress Header - Compact */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Customer {currentIndex + 1} of {audience.length}
          </h2>
          <div className="text-sm text-gray-500">
            {Math.round(((currentIndex + 1) / audience.length) * 100)}% complete
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / audience.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Customer Display - Optimized */}
      <Card>
        <CardContent className="p-4">
          {currentCustomer ? (
            <div className="space-y-4">
              {/* Primary Info - Name & Phone */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{currentCustomer.customer_name}</h3>
                {currentCustomer.contact_number ? (
                  <a 
                    href={`tel:${currentCustomer.contact_number}`}
                    className="inline-flex items-center gap-2 w-full justify-center px-4 py-3 bg-green-500 text-white rounded-lg font-medium text-base hover:bg-green-600 active:bg-green-700 transition-colors"
                  >
                    <Phone className="h-5 w-5" />
                    {currentCustomer.contact_number}
                  </a>
                ) : (
                  <p className="text-gray-500 text-center py-3">No phone number</p>
                )}
              </div>

              {/* Package Info - Enhanced with activation status */}
              {currentCustomer.last_package_name && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Last Package</span>
                    <div className="flex gap-1">
                      {currentCustomer.active_packages > 0 && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Active
                        </span>
                      )}
                      {/* Add activation status */}
                      {currentCustomer.last_package_first_use_date ? (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Used
                        </span>
                      ) : (
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Not Used
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-medium text-sm text-gray-900">{currentCustomer.last_package_name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {currentCustomer.last_package_type}
                    {currentCustomer.last_package_expiration_date && 
                      ` • Expires ${new Date(currentCustomer.last_package_expiration_date).toLocaleDateString()}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Purchased: {new Date(currentCustomer.last_package_purchase_date).toLocaleDateString()}
                    {currentCustomer.last_package_first_use_date && 
                      ` • First used: ${new Date(currentCustomer.last_package_first_use_date).toLocaleDateString()}`}
                  </p>
                </div>
              )}

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-3 text-center border">
                  <p className="text-xs text-gray-600 mb-1">Lifetime Value</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(currentCustomer.lifetime_spending)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border">
                  <p className="text-xs text-gray-600 mb-1">Last Visit</p>
                  <p className="text-sm font-bold text-gray-900">{currentCustomer.last_visit_date || 'Never'}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {currentCustomer.has_coaching && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                    🏌️ Had Coaching
                  </span>
                )}
                {currentCustomer.active_packages === 0 && currentCustomer.last_package_name && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                    📦 Previous Package User
                  </span>
                )}
                {currentCustomer.last_contacted && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                    📞 Previously Contacted
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No customer data available</p>
          )}
        </CardContent>
      </Card>

      {/* Notes Form - Mobile Optimized */}
      <Card className="shadow-md">
        <CardContent className="p-4 space-y-5">
          {/* Quick Status - Mobile Optimized */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold mb-3 block text-gray-800 flex items-center gap-1">
                  Reachable? 
                  <span className="text-red-500">*</span>
                  {isReachableSet && <span className="text-green-500 text-xs">✓</span>}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={notesData.reachable === 'yes' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setNotesData({ ...notesData, reachable: 'yes' })}
                    className={cn(
                      "text-sm py-4 font-medium transition-all",
                      notesData.reachable === 'yes' && "bg-green-500 hover:bg-green-600"
                    )}
                  >
                    ✓ Yes
                  </Button>
                  <Button
                    variant={notesData.reachable === 'no' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setNotesData({ ...notesData, reachable: 'no' })}
                    className={cn(
                      "text-sm py-4 font-medium transition-all",
                      notesData.reachable === 'no' && "bg-red-500 hover:bg-red-600"
                    )}
                  >
                    ✗ No
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-semibold mb-3 block text-gray-800 flex items-center gap-1">
                  Follow-up? 
                  <span className="text-red-500">*</span>
                  {isFollowUpSet && <span className="text-green-500 text-xs">✓</span>}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={notesData.followUp === 'yes' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setNotesData({ ...notesData, followUp: 'yes' })}
                    className={cn(
                      "text-sm py-4 font-medium transition-all",
                      notesData.followUp === 'yes' && "bg-orange-500 hover:bg-orange-600"
                    )}
                  >
                    ✓ Yes
                  </Button>
                  <Button
                    variant={notesData.followUp === 'no' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setNotesData({ ...notesData, followUp: 'no' })}
                    className={cn(
                      "text-sm py-4 font-medium transition-all",
                      notesData.followUp === 'no' && "bg-gray-500 hover:bg-gray-600"
                    )}
                  >
                    ✗ No
                  </Button>
                </div>
              </div>
            </div>

            {/* Response Field - Simple Button Selection */}
            <div>
              <Label className="text-sm font-semibold mb-3 block text-gray-800">Customer Response</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={notesData.response === 'positive' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setNotesData({ ...notesData, response: 'positive' })}
                  className={cn(
                    "text-sm py-4 font-medium transition-all",
                    notesData.response === 'positive' && "bg-primary hover:bg-primary/90"
                  )}
                >
                  👍 Positive
                </Button>
                <Button
                  variant={notesData.response === 'neutral' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setNotesData({ ...notesData, response: 'neutral' })}
                  className={cn(
                    "text-sm py-4 font-medium transition-all",
                    notesData.response === 'neutral' && "bg-muted-foreground hover:bg-muted-foreground/90"
                  )}
                >
                  😐 Neutral
                </Button>
                <Button
                  variant={notesData.response === 'negative' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setNotesData({ ...notesData, response: 'negative' })}
                  className={cn(
                    "text-sm py-4 font-medium transition-all",
                    notesData.response === 'negative' && "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  👎 Negative
                </Button>
              </div>
            </div>

            {/* Timeline - only show if reachable */}
            {notesData.reachable === 'yes' && (
              <div>
                <Label className="text-sm font-semibold mb-3 block text-gray-800">Visit Timeline</Label>
                <Select 
                  value={notesData.timeline} 
                  onValueChange={(value) => setNotesData({ ...notesData, timeline: value })}
                >
                  <SelectTrigger className="w-full h-14 text-base border-2">
                    <SelectValue placeholder="When will they visit?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_week">📅 This week</SelectItem>
                    <SelectItem value="next_week">📅 Next week</SelectItem>
                    <SelectItem value="this_month">📅 This month</SelectItem>
                    <SelectItem value="next_month">📅 Next month</SelectItem>
                    <SelectItem value="no_timeline">❓ No timeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Notes - Mobile Optimized */}
          <div>
            <Label className="text-sm font-semibold mb-3 block text-gray-800 flex items-center gap-1">
              Call Notes 
              <span className="text-red-500">*</span>
              {hasNotes && <span className="text-green-500 text-xs">✓</span>}
            </Label>
            <textarea
              placeholder="What happened during the call? Include key details..."
              value={notesData.notes}
              onChange={(e) => {
                setNotesData({ ...notesData, notes: e.target.value });
                setHasUnsavedNotes(true);
              }}
              className={cn(
                "w-full p-4 text-base border-2 rounded-lg resize-none transition-colors",
                hasNotes ? "border-green-300 focus:border-green-500" : "border-gray-300 focus:border-blue-500",
                "focus:ring-2 focus:ring-blue-200"
              )}
              rows={4}
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
            <p className="text-xs text-gray-500 mt-1">
              {notesData.notes.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20">
        <div className="max-w-md mx-auto">
          {/* Validation Status */}
          <div className="flex items-center justify-center gap-4 mb-3 text-xs">
            <div className={cn(
              "flex items-center gap-1",
              isReachableSet ? "text-green-600" : "text-red-500"
            )}>
              {isReachableSet ? "✓" : "○"} Reachable
            </div>
            <div className={cn(
              "flex items-center gap-1",
              isFollowUpSet ? "text-green-600" : "text-red-500"
            )}>
              {isFollowUpSet ? "✓" : "○"} Follow-up
            </div>
            <div className={cn(
              "flex items-center gap-1",
              hasNotes ? "text-green-600" : "text-red-500"
            )}>
              {hasNotes ? "✓" : "○"} Notes
            </div>
          </div>
          
          {/* Action Button */}
          <Button
            size="lg"
            onClick={() => handleLog(false)}
            disabled={!isFormValid || isSubmitting}
            className={cn(
              "w-full py-4 text-base font-semibold transition-all",
              isFormValid ? "bg-green-500 hover:bg-green-600" : "bg-gray-300"
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </div>
            ) : isFormValid ? (
              `Save & Continue (${currentIndex + 1}/${audience.length})`
            ) : (
              'Complete all fields to save'
            )}
          </Button>
        </div>
      </div>

      {/* Logged Calls */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm max-h-60 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="border-b border-gray-100 pb-2 last:border-b-0">
                  <div className="font-medium text-xs text-gray-500">{log.timestamp}</div>
                  <div className="text-gray-700 text-xs">{log.summary}</div>
                  <div className="text-sm">{log.details}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}