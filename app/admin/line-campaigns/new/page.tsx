'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { TimeField } from '@/components/ui/time-field';
import {
  ArrowLeft,
  Send,
  RefreshCw,
  Users,
  MessageSquare,
  CheckCircle,
  ImageIcon,
  X,
  Upload,
  Clock,
  Calendar,
  Type,
  LayoutTemplate,
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

type MessageType = 'text' | 'flex';
type ScheduleType = 'immediate' | 'scheduled';

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAudienceId = searchParams.get('audience_id');

  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [templates, setTemplates] = useState<FlexTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [selectedAudienceId, setSelectedAudienceId] = useState(preselectedAudienceId || '');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [textMessage, setTextMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('immediate');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchData = useCallback(async () => {
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
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Track preview URL for cleanup
  const previewUrlRef = useRef<string>('');

  // Image upload via dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Revoke previous preview URL to avoid memory leak
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    previewUrlRef.current = localPreview;
    setImagePreview(localPreview);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/line/campaigns/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setImageUrl(data.url);
      toast.success('Image uploaded');
    } catch (error) {
      setImagePreview('');
      setImageUrl('');
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const removeImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setImageUrl('');
    setImagePreview('');
  };

  const selectedAudience = audiences.find(a => a.id === selectedAudienceId);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Validation
  const isAudienceValid = !!selectedAudienceId;
  const isMessageValid = messageType === 'flex'
    ? !!selectedTemplateId
    : !!textMessage.trim();
  const isScheduleValid = scheduleType === 'immediate' || (!!scheduledDate && !!scheduledTime);
  const isFormValid = !!campaignName.trim() && isAudienceValid && isMessageValid && isScheduleValid;

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error('Please complete all required fields');
      return;
    }

    setSending(true);
    try {
      // Build scheduled_at ISO string if scheduled
      let scheduledAt: string | undefined;
      if (scheduleType === 'scheduled' && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const dt = new Date(scheduledDate);
        dt.setHours(hours, minutes, 0, 0);
        scheduledAt = dt.toISOString();
      }

      // Build request body
      const body: Record<string, any> = {
        name: campaignName.trim(),
        audience_id: selectedAudienceId,
        message_type: messageType,
        schedule_type: scheduleType,
      };

      if (messageType === 'text') {
        body.text_message = textMessage.trim();
        if (imageUrl) {
          body.image_url = imageUrl;
        }
      } else {
        const template = templates.find(t => t.id === selectedTemplateId);
        body.flex_message = template?.flex_json;
      }

      if (scheduledAt) {
        body.scheduled_at = scheduledAt;
      }

      // Create campaign
      const createRes = await fetch('/api/line/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const createData = await createRes.json();
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create campaign');
      }

      // If immediate, send right away
      if (scheduleType === 'immediate') {
        const sendRes = await fetch(`/api/line/campaigns/${createData.campaign.id}/send`, {
          method: 'POST',
        });

        const sendData = await sendRes.json();
        if (!sendData.success) {
          throw new Error(sendData.error || 'Failed to send campaign');
        }

        toast.success('Campaign sent!');
      } else {
        toast.success('Campaign scheduled!');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/admin/line-campaigns/${createData.campaign.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-3xl py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container max-w-3xl py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {scheduleType === 'immediate' ? 'Campaign Sent!' : 'Campaign Scheduled!'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Redirecting to campaign details...
            </p>
            <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/admin/line-campaigns')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaigns
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Create Broadcast Campaign</h1>
        <p className="text-muted-foreground">
          Send text, images, or rich templates to your LINE audiences
        </p>
      </div>

      <div className="space-y-6">
        {/* Campaign Name */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campaign Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., We'll Golf February Promo"
            />
          </CardContent>
        </Card>

        {/* Audience Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            {audiences.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">No audiences with active members</p>
                <Button size="sm" onClick={() => router.push('/staff/line-audiences')}>
                  Create Audience
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {audiences.map((audience) => (
                  <div
                    key={audience.id}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-colors
                      ${selectedAudienceId === audience.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}
                    `}
                    onClick={() => setSelectedAudienceId(audience.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{audience.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                          <Users className="h-3.5 w-3.5" />
                          {audience.stats.active_members} members
                          <Badge variant="outline" className="text-xs">{audience.type}</Badge>
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
          </CardContent>
        </Card>

        {/* Message Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type toggle */}
            <RadioGroup
              value={messageType}
              onValueChange={(v) => setMessageType(v as MessageType)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="type-text"
                className={`
                  flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                  ${messageType === 'text' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}
                `}
              >
                <RadioGroupItem value="text" id="type-text" />
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <div>
                    <div className="font-medium text-sm">Text + Image</div>
                    <div className="text-xs text-muted-foreground">Message with optional photo</div>
                  </div>
                </div>
              </Label>
              <Label
                htmlFor="type-flex"
                className={`
                  flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                  ${messageType === 'flex' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}
                `}
              >
                <RadioGroupItem value="flex" id="type-flex" />
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  <div>
                    <div className="font-medium text-sm">Flex Template</div>
                    <div className="text-xs text-muted-foreground">Rich interactive layout</div>
                  </div>
                </div>
              </Label>
            </RadioGroup>

            {/* Text + Image fields */}
            {messageType === 'text' && (
              <div className="space-y-4">
                {/* Image dropzone */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Image <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Campaign preview"
                        className="rounded-lg max-h-48 object-contain border"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      {...getRootProps()}
                      className={`
                        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                        ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                      `}
                    >
                      <input {...getInputProps()} />
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {isDragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, WebP up to 5 MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Text message */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Message Text</Label>
                    <span className="text-xs text-muted-foreground">
                      {textMessage.length} / 5,000
                    </span>
                  </div>
                  <Textarea
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={5}
                    maxLength={5000}
                  />
                </div>
              </div>
            )}

            {/* Flex template selector */}
            {messageType === 'flex' && (
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No templates available
                  </div>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className={`
                        p-3 border rounded-lg cursor-pointer transition-colors
                        ${selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}
                      `}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {template.description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-xs">{template.category}</Badge>
                            {template.variables.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Variables: {template.variables.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedTemplateId === template.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as ScheduleType)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="schedule-now"
                className={`
                  flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                  ${scheduleType === 'immediate' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}
                `}
              >
                <RadioGroupItem value="immediate" id="schedule-now" />
                <div>
                  <div className="font-medium text-sm">Send Now</div>
                  <div className="text-xs text-muted-foreground">Deliver immediately</div>
                </div>
              </Label>
              <Label
                htmlFor="schedule-later"
                className={`
                  flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                  ${scheduleType === 'scheduled' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}
                `}
              >
                <RadioGroupItem value="scheduled" id="schedule-later" />
                <div>
                  <div className="font-medium text-sm">Schedule</div>
                  <div className="text-xs text-muted-foreground">Pick date & time</div>
                </div>
              </Label>
            </RadioGroup>

            {scheduleType === 'scheduled' && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <DatePicker
                  label="Date"
                  value={scheduledDate}
                  onChange={setScheduledDate}
                />
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Time</Label>
                  <TimeField
                    value={scheduledTime}
                    onChange={setScheduledTime}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review & Send */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review & Send</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="border rounded-lg divide-y text-sm">
              <div className="p-3 flex justify-between">
                <span className="text-muted-foreground">Audience</span>
                <span className="font-medium">
                  {selectedAudience
                    ? `${selectedAudience.name} (${selectedAudience.stats.active_members})`
                    : <span className="text-destructive">Not selected</span>}
                </span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-muted-foreground">Message</span>
                <span className="font-medium">
                  {messageType === 'flex'
                    ? (selectedTemplate?.name || <span className="text-destructive">No template</span>)
                    : (textMessage.trim()
                      ? `Text${imageUrl ? ' + Image' : ''}`
                      : <span className="text-destructive">No message</span>)}
                </span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium">
                  {scheduleType === 'immediate'
                    ? 'Send now'
                    : (scheduledDate
                      ? `${format(scheduledDate, 'MMM d, yyyy')} at ${scheduledTime}`
                      : <span className="text-destructive">No date set</span>)}
                </span>
              </div>
            </div>

            {/* Info banner */}
            {isFormValid && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-900">
                    {scheduleType === 'immediate' ? (
                      <>Will send to <strong>{selectedAudience?.stats.active_members}</strong> members with rate limiting (500/min).</>
                    ) : (
                      <>Campaign will be sent automatically at the scheduled time.</>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={!isFormValid || sending}
            >
              {sending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {scheduleType === 'immediate' ? 'Sending...' : 'Scheduling...'}
                </>
              ) : scheduleType === 'immediate' ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Campaign
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Campaign
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
