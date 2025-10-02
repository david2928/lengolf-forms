'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Send,
  RefreshCw,
  Users,
  MessageSquare,
  CheckCircle
} from 'lucide-react';

interface FlexTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  flex_json: any;
  variables: string[];
}

interface Audience {
  id: string;
  name: string;
  type: string;
  stats: {
    active_members: number;
  };
}

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAudienceId = searchParams.get('audience_id');

  const [step, setStep] = useState(1);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [templates, setTemplates] = useState<FlexTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [selectedAudienceId, setSelectedAudienceId] = useState(preselectedAudienceId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [audiencesRes, templatesRes] = await Promise.all([
        fetch('/api/line/audiences'),
        fetch('/api/line/flex-templates?is_active=true')
      ]);

      const audiencesData = await audiencesRes.json();
      const templatesData = await templatesRes.json();

      if (audiencesData.success) {
        setAudiences(audiencesData.audiences.filter((a: Audience) => a.stats.active_members > 0));
      }

      if (templatesData.success) {
        setTemplates(templatesData.templates);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAndSendCampaign = async () => {
    if (!campaignName || !selectedAudienceId || !selectedTemplateId) {
      alert('Please complete all fields');
      return;
    }

    setSending(true);
    try {
      // Get template
      const template = templates.find(t => t.id === selectedTemplateId);
      if (!template) {
        alert('Template not found');
        return;
      }

      // Create campaign
      const createResponse = await fetch('/api/line/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          audience_id: selectedAudienceId,
          message_type: 'flex',
          flex_message: template.flex_json,
          schedule_type: 'immediate'
        })
      });

      const createData = await createResponse.json();
      if (!createData.success) {
        alert(`Failed to create campaign: ${createData.error}`);
        return;
      }

      // Send campaign
      const sendResponse = await fetch(`/api/line/campaigns/${createData.campaign.id}/send`, {
        method: 'POST'
      });

      const sendData = await sendResponse.json();
      if (sendData.success) {
        setStep(4); // Success step
        setTimeout(() => {
          router.push(`/staff/line-campaigns/${createData.campaign.id}`);
        }, 2000);
      } else {
        alert(`Failed to send campaign: ${sendData.error}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const selectedAudience = audiences.find(a => a.id === selectedAudienceId);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="container max-w-4xl py-6">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/staff/line-campaigns')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaigns
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Create Broadcast Campaign</h1>
        <p className="text-muted-foreground">
          Send rich messages to your LINE audiences
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
              {s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Audience */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Audience</CardTitle>
            <CardDescription>Choose which audience to send to</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {audiences.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No audiences with active members</p>
                <Button onClick={() => router.push('/staff/line-audiences')}>
                  Create Audience
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {audiences.map((audience) => (
                  <div
                    key={audience.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${selectedAudienceId === audience.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}
                    `}
                    onClick={() => setSelectedAudienceId(audience.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{audience.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Users className="h-4 w-4" />
                          {audience.stats.active_members} active members
                          <Badge variant="outline">{audience.type}</Badge>
                        </div>
                      </div>
                      {selectedAudienceId === audience.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {audiences.length > 0 && (
              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!selectedAudienceId}
              >
                Continue
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Template */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Message Template</CardTitle>
            <CardDescription>Choose a template for your message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates available
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}
                    `}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{template.category}</Badge>
                          {template.variables.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Variables: {template.variables.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedTemplateId === template.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(3)}
                disabled={!selectedTemplateId}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review and Send */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Review and Send</CardTitle>
            <CardDescription>Review your campaign before sending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Weekly Coaching Reminder - Jan 2025"
              />
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Audience</div>
                <div className="font-semibold">{selectedAudience?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedAudience?.stats.active_members} recipients
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">Template</div>
                <div className="font-semibold">{selectedTemplate?.name}</div>
                <div className="text-sm text-muted-foreground">{selectedTemplate?.category}</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <div className="font-semibold mb-1">Ready to send</div>
                  <div>
                    This will send the message to {selectedAudience?.stats.active_members} active members.
                    Messages are sent with a delay to comply with LINE rate limits (500/min).
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={createAndSendCampaign}
                disabled={sending || !campaignName}
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Campaign
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Campaign Started!</h3>
            <p className="text-muted-foreground mb-4">
              Your broadcast is being sent. Redirecting to campaign details...
            </p>
            <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
