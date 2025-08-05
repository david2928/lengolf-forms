'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Phone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  meta_submitted_at: string;
  display_name: string;
  needs_followup?: boolean;
  group_size?: string;
  preferred_time?: string;
  planned_visit?: string;
  additional_inquiries?: string;
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState<FeedbackFormData>({
    was_reachable: true,
    response_type: undefined,
    visit_timeline: undefined,
    requires_followup: false,
    booking_submitted: false,
    comments: ''
  });

  useEffect(() => {
    fetchLeadsWithoutFeedback();
  }, []);

  useEffect(() => {
    // Filter leads based on search term
    const filtered = leads.filter(lead => 
      lead.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone_number.includes(searchTerm) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLeads(filtered);
  }, [searchTerm, leads]);

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
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">B2C Lead Feedback</h1>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6 md:mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-green-600">{leads.filter(l => !l.needs_followup).length}</p>
            <p className="text-sm md:text-base text-gray-600">New Calls</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-orange-600">{leads.filter(l => l.needs_followup).length}</p>
            <p className="text-sm md:text-base text-gray-600">Follow-ups</p>
          </div>
        </div>
      </div>

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
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold mb-4">Select Lead</h2>
        
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
            filteredLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 md:p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedLead?.id === lead.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-base md:text-sm truncate">{lead.display_name}</p>
                      {lead.needs_followup && (
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full flex-shrink-0">
                          Follow-up
                        </span>
                      )}
                    </div>
                    <p className="text-sm md:text-xs text-gray-600 truncate">{lead.email || 'No email'}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(lead.meta_submitted_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <Phone className="h-5 w-5 text-gray-400 ml-3 flex-shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Lead Details */}
        {selectedLead && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2 text-base md:text-sm">Lead Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm md:text-xs">
              <p><span className="font-medium">Name:</span> {selectedLead.full_name}</p>
              <p><span className="font-medium">Phone:</span> {selectedLead.phone_number}</p>
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
      </div>

      {/* Feedback Form */}
      {selectedLead && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Call Outcome</h2>

          {/* Was Reachable */}
          <div className="mb-6">
            <label className="block text-base md:text-sm font-medium mb-3">
              Was the customer reachable? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="reachable"
                  checked={formData.was_reachable === true}
                  onChange={() => setFormData({ ...formData, was_reachable: true })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-base md:text-sm">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="reachable"
                  checked={formData.was_reachable === false}
                  onChange={() => setFormData({ ...formData, was_reachable: false })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-base md:text-sm">No</span>
              </label>
            </div>
          </div>

          {/* Response Type - Only show if reachable */}
          {formData.was_reachable && (
            <>
              <div className="mb-6">
                <label className="block text-base md:text-sm font-medium mb-3">
                  How did the customer respond to the call? <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={formData.response_type || ''} 
                  onValueChange={(value) => setFormData({ ...formData, response_type: value as any })}
                  required={formData.was_reachable}
                >
                  <SelectTrigger className="w-full h-12 md:h-10 text-base md:text-sm">
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

              <div className="mb-6">
                <label className="block text-base md:text-sm font-medium mb-3">
                  When is the customer planning to visit LENGOLF?
                </label>
                <Select 
                  value={formData.visit_timeline || ''} 
                  onValueChange={(value) => setFormData({ ...formData, visit_timeline: value as any || undefined })}
                >
                  <SelectTrigger className="w-full h-12 md:h-10 text-base md:text-sm">
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
          <div className="mb-6">
            <label className="block text-base md:text-sm font-medium mb-3">
              Does this lead require a follow-up? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="followup"
                  checked={formData.requires_followup === true}
                  onChange={() => setFormData({ ...formData, requires_followup: true })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-base md:text-sm">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="followup"
                  checked={formData.requires_followup === false}
                  onChange={() => setFormData({ ...formData, requires_followup: false })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-base md:text-sm">No</span>
              </label>
            </div>
          </div>

          {/* Booking Submitted */}
          <div className="mb-6">
            <label className="block text-base md:text-sm font-medium mb-3">
              Was the lead successfully closed and booking submitted? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="booking"
                  checked={formData.booking_submitted === true}
                  onChange={() => setFormData({ ...formData, booking_submitted: true })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-base md:text-sm">Yes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="booking"
                  checked={formData.booking_submitted === false}
                  onChange={() => setFormData({ ...formData, booking_submitted: false })}
                  className="mr-3 w-4 h-4"
                />
                <span className="text-base md:text-sm">No</span>
              </label>
            </div>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label className="block text-base md:text-sm font-medium mb-3">
              Additional Comments (optional):
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={4}
              className="w-full p-3 md:p-2 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any additional notes about the call..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-4 md:py-3 px-4 text-base md:text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}
    </div>
  );
}