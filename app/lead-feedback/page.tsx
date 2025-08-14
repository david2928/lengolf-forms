'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Phone, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Clock, Target, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    }
  }, [activeTab]);

  // Poll for audience changes when on OB Sales tab
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'ob-sales') {
      interval = setInterval(() => {
        loadSelectedAudience();
      }, 15000); // Check every 15 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]); // Remove loadSelectedAudience from dependencies to prevent excessive calls

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
    <div className="container mx-auto px-3 py-3 md:py-6 max-w-7xl">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">B2C Lead Feedback</h1>
      
      {/* Key Metrics - Consolidated */}
      <Card className="mb-4">
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 text-center">
            {/* Speed to Lead */}
            <div>
              <Clock className="h-4 w-4 text-blue-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-blue-600">{dashboardStats.speedToLead}</p>
              <p className="text-xs text-gray-600">Speed</p>
            </div>
            
            {/* This Week */}
            <div>
              <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-blue-500">{dashboardStats.weekAverage}</p>
              <p className="text-xs text-gray-600">Week Avg</p>
            </div>
            
            {/* This Month */}
            <div>
              <Clock className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-blue-400">{dashboardStats.monthAverage}</p>
              <p className="text-xs text-gray-600">Month Avg</p>
            </div>
            
            {/* OB Calls */}
            <div>
              <Users className="h-4 w-4 text-purple-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-purple-600">{dashboardStats.obCalls}</p>
              <p className="text-xs text-gray-600">OB Calls</p>
            </div>
            
            {/* Sales */}
            <div>
              <Target className="h-4 w-4 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-green-600">{dashboardStats.sales}</p>
              <p className="text-xs text-gray-600">Sales</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="new-leads" className="text-sm md:text-base">New Leads</TabsTrigger>
          <TabsTrigger value="ob-sales" className="text-sm md:text-base">OB Sales</TabsTrigger>
        </TabsList>

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
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Button 
                onClick={loadSelectedAudience} 
                variant="outline"
                disabled={obLoading}
                className="w-full sm:w-auto"
              >
                {obLoading ? 'Refreshing...' : 'Refresh Audience'}
              </Button>
              <div className="text-xs text-gray-500 text-center sm:text-right">
                {obAudience.length > 0 ? (
                  <div className="space-y-1">
                    <div>Updated: {new Date().toLocaleTimeString()}</div>
                    {obAudienceInfo?.sortBy && (
                      <div>Sort: {obAudienceInfo.sortBy}</div>
                    )}
                  </div>
                ) : (
                  <div>Auto-refreshes every 15s</div>
                )}
              </div>
            </div>
          </div>
          <OBSalesTab
            audience={obAudience}
            currentIndex={currentCustomerIndex}
            onIndexChange={setCurrentCustomerIndex}
            loading={obLoading}
            onReload={loadSelectedAudience}
            onStatsUpdate={loadDashboardStats}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// OB Sales Tab Component
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
  response: string;
  timeline: string;
  followUp: 'yes' | 'no' | '';
  bookingSubmitted: 'yes' | 'no' | '';
  notes: string;
}

function OBSalesTab({ audience, currentIndex, onIndexChange, loading, onReload, onStatsUpdate }: OBSalesTabProps) {
  const [notesData, setNotesData] = useState<OBNotesFormData>({
    reachable: '',
    response: '',
    timeline: '',
    followUp: '',
    bookingSubmitted: '',
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

  const currentCustomer = audience[currentIndex];
  const canLog = notesData.notes.trim().length > 0;
  const hasNotesForCurrentCustomer = currentCustomer ? customerNotesStatus[currentCustomer.id] || false : false;

  const handleNext = () => {
    // Only allow navigation if notes have been saved for current customer
    if (currentIndex < audience.length - 1 && hasNotesForCurrentCustomer) {
      onIndexChange(currentIndex + 1);
      resetForm();
      setHasUnsavedNotes(false);
    }
  };

  const handlePrevious = () => {
    // Only allow navigation if notes have been saved for current customer  
    if (currentIndex > 0 && hasNotesForCurrentCustomer) {
      onIndexChange(currentIndex - 1);
      resetForm();
      setHasUnsavedNotes(false);
    }
  };

  const resetForm = () => {
    setNotesData({
      reachable: '',
      response: '',
      timeline: '',
      followUp: '',
      bookingSubmitted: '',
      notes: ''
    });
  };

  const handleLog = async (createBooking: boolean) => {
    if (!canLog || !currentCustomer) return;
    
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
          booking_submitted: notesData.bookingSubmitted === 'yes',
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
        resetForm();
        
        // Update dashboard statistics
        onStatsUpdate();
        
        if (createBooking) {
          // Future: Implement booking navigation
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to save call notes:', errorData);
      }
    } catch (error) {
      console.error('Error saving call notes:', error);
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
    <div className="space-y-4">
      {/* Customer Display */}
      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg">
                  Customer {currentIndex + 1} of {audience.length}
                </CardTitle>
                {!hasNotesForCurrentCustomer && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠ Save call notes to navigate to next customer
                  </p>
                )}
                {hasNotesForCurrentCustomer && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Notes saved for this customer
                  </p>
                )}
              </div>
              <div className="flex gap-2 sm:flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex <= 0 || !hasNotesForCurrentCustomer}
                  onClick={handlePrevious}
                  title={!hasNotesForCurrentCustomer ? "Save notes first" : ""}
                  className="flex-1 sm:flex-none"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex >= audience.length - 1 || !hasNotesForCurrentCustomer}
                  onClick={handleNext}
                  title={!hasNotesForCurrentCustomer ? "Save notes first" : ""}
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {currentCustomer ? (
            <div className="space-y-3">
              {/* Name and Phone - Priority info */}
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Customer</Label>
                  <p className="text-lg font-medium">{currentCustomer.customer_name}</p>
                </div>
                <div>
                  {currentCustomer.contact_number ? (
                    <a 
                      href={`tel:${currentCustomer.contact_number}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-lg font-medium bg-blue-50 px-3 py-2 rounded-lg"
                    >
                      <Phone className="h-4 w-4" />
                      {currentCustomer.contact_number}
                    </a>
                  ) : (
                    <p className="text-gray-500">No phone number</p>
                  )}
                </div>
              </div>
              
              {/* Compact secondary info */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Lifetime Value</p>
                  <p className="text-sm font-medium">{currentCustomer.lifetime_spending ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(currentCustomer.lifetime_spending) : '-'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Last Visit</p>
                  <p className="text-sm font-medium">{currentCustomer.last_visit_date || 'Never'}</p>
                </div>
              </div>
              
              {/* Last contacted - only if available */}
              {currentCustomer.last_contacted && (
                <div className="text-center pt-1">
                  <p className="text-xs text-gray-500">Last Contacted: {new Date(currentCustomer.last_contacted).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No customer data available</p>
          )}
        </CardContent>
      </Card>

      {/* Notes Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Status - Reachable and Follow-up in one row */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Reachable?</Label>
                <div className="flex gap-2">
                  <Button
                    variant={notesData.reachable === 'yes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNotesData({ ...notesData, reachable: 'yes' })}
                    className="flex-1"
                  >
                    Yes
                  </Button>
                  <Button
                    variant={notesData.reachable === 'no' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNotesData({ ...notesData, reachable: 'no' })}
                    className="flex-1"
                  >
                    No
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">Follow-up?</Label>
                <div className="flex gap-2">
                  <Button
                    variant={notesData.followUp === 'yes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNotesData({ ...notesData, followUp: 'yes' })}
                    className="flex-1"
                  >
                    Yes
                  </Button>
                  <Button
                    variant={notesData.followUp === 'no' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNotesData({ ...notesData, followUp: 'no' })}
                    className="flex-1"
                  >
                    No
                  </Button>
                </div>
              </div>
            </div>

            {/* Conditional fields - only show if reachable */}
            {notesData.reachable === 'yes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Response */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Response</Label>
                  <input
                    type="text"
                    placeholder="Interested/Not interested"
                    value={notesData.response}
                    onChange={(e) => setNotesData({ ...notesData, response: e.target.value })}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Visit timeline */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Timeline</Label>
                  <input
                    type="text"
                    placeholder="This week/Next month"
                    value={notesData.timeline}
                    onChange={(e) => setNotesData({ ...notesData, timeline: e.target.value })}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Booking submitted - full width */}
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium mb-2 block">Booking submitted?</Label>
                  <div className="flex gap-3">
                    <Button
                      variant={notesData.bookingSubmitted === 'yes' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNotesData({ ...notesData, bookingSubmitted: 'yes' })}
                      className="flex-1"
                    >
                      Yes
                    </Button>
                    <Button
                      variant={notesData.bookingSubmitted === 'no' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNotesData({ ...notesData, bookingSubmitted: 'no' })}
                      className="flex-1"
                    >
                      No
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes - always visible */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Call notes (required)</Label>
            <textarea
              placeholder="Add your call notes here..."
              value={notesData.notes}
              onChange={(e) => {
                setNotesData({ ...notesData, notes: e.target.value });
                setHasUnsavedNotes(true);
              }}
              className="w-full p-3 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => handleLog(false)}
              disabled={!canLog}
              className="flex-1 sm:flex-none"
            >
              Log
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleLog(true)}
              disabled={!canLog}
              className="flex-1 sm:flex-none"
            >
              Log and create booking
            </Button>
          </div>
        </CardContent>
      </Card>

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