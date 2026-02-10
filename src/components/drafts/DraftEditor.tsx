'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Linkedin,
  Twitter,
  X,
  Save,
  Loader2,
  Copy,
  Check,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  Scissors,
  MessageSquare,
  BookOpen,
  ListPlus,
  Hash,
  Send,
  Download,
  ExternalLink,
  ZoomIn,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { PublishDialog } from '@/components/publish/PublishDialog';
import type { Draft, GeneratedImage, FunnelStage } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';

interface DraftEditorProps {
  draft: Draft;
  onUpdate: (draft: Draft) => void;
  onClose: () => void;
}

const platformConfig: Record<string, { icon: React.ElementType; color: string; label: string; charLimit: number }> = {
  linkedin: { icon: Linkedin, color: 'text-blue-500', label: 'LinkedIn', charLimit: 3000 },
  x: { icon: Twitter, color: 'text-foreground', label: 'X', charLimit: 280 },
};

const funnelStageOptions: { value: FunnelStage | 'none'; label: string; color: string }[] = [
  { value: 'none', label: 'Not set', color: 'text-muted-foreground' },
  { value: 'tofu', label: 'TOFU - Awareness', color: 'text-blue-500' },
  { value: 'mofu', label: 'MOFU - Consideration', color: 'text-amber-500' },
  { value: 'bofu', label: 'BOFU - Conversion', color: 'text-emerald-500' },
];

const regenerateActions = [
  { id: 'hook', label: 'New Hook', icon: Sparkles, description: 'Generate a more attention-grabbing opening' },
  { id: 'shorten', label: 'Shorten', icon: Scissors, description: 'Make the post more concise' },
  { id: 'direct', label: 'More Direct', icon: MessageSquare, description: 'Make it more assertive' },
  { id: 'storytelling', label: 'Add Story', icon: BookOpen, description: 'Add storytelling elements' },
  { id: 'cta', label: 'New CTA', icon: ListPlus, description: 'Generate alternative CTAs' },
  { id: 'thread', label: 'Thread', icon: Hash, description: 'Convert to thread format' },
];

export function DraftEditor({ draft, onUpdate, onClose }: DraftEditorProps) {
  const { session } = useAuth();
  const [content, setContent] = useState(draft.content_text);
  const [hashtags, setHashtags] = useState(draft.hashtags || []);
  const [funnelStage, setFunnelStage] = useState<FunnelStage | null>(draft.funnel_stage || null);
  const [loading, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);

  const config = platformConfig[draft.platform] || platformConfig.linkedin;
  const Icon = config.icon;
  const hasImages = draft.images && draft.images.length > 0;

  const hasChanges = content !== draft.content_text || 
    JSON.stringify(hashtags) !== JSON.stringify(draft.hashtags) ||
    funnelStage !== (draft.funnel_stage || null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_text: content, hashtags, funnel_stage: funnelStage }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      toast.success('Draft saved!');
      onUpdate(data.data.draft);
    } catch (error) {
      logger.error('Failed to save draft', { error });
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (action: string) => {
    setRegenerating(action);
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${fastApiUrl}/api/generation/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ draft_id: draft.id, action }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      if (data.data.content) {
        setContent(data.data.content);
        toast.success(`Regenerated: ${action}`);
      } else if (data.data.options) {
        // Handle CTA options
        toast.info('CTA options generated', {
          description: 'Check the console for options (UI coming soon)',
        });
        console.log('CTA Options:', data.data.options);
      }
    } catch (error) {
      logger.error('Regeneration failed', { error });
      toast.error('Regeneration failed', {
        description: 'Make sure the FastAPI backend is running.',
      });
    } finally {
      setRegenerating(null);
    }
  };

  const handleCopy = async () => {
    try {
      const fullText = content + (hashtags.length > 0 ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : '');
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleUseVariant = (variantContent: string) => {
    setContent(variantContent);
    setSelectedVariant(null);
    toast.success('Variant applied');
  };

  const handleGenerateImages = async () => {
    setGeneratingImages(true);
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${fastApiUrl}/api/images/generate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          draft_id: draft.id,
          count: 2,
          styles: ['infographic', 'comparison'],
          aspect_ratio: '1:1',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.detail || 'Generation failed');
      }

      toast.success(`Generated ${data.data.images.length} images!`);
      
      // Refresh draft to get new images
      const refreshResponse = await fetch(`/api/drafts/${draft.id}`);
      const refreshData = await refreshResponse.json();
      if (refreshData.success) {
        onUpdate(refreshData.data.draft);
      }
    } catch (error) {
      logger.error('Image generation failed', { error });
      toast.error('Image generation failed', {
        description: error instanceof Error ? error.message : 'Check that the backend is running',
      });
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleRegenerateImage = async (imageId: string) => {
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${fastApiUrl}/api/images/regenerate/${imageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Regeneration failed');
      }

      toast.success('Image regenerated!');
      
      // Refresh draft to get updated images
      const refreshResponse = await fetch(`/api/drafts/${draft.id}`);
      const refreshData = await refreshResponse.json();
      if (refreshData.success) {
        onUpdate(refreshData.data.draft);
        setSelectedImage(null);
      }
    } catch (error) {
      logger.error('Image regeneration failed', { error });
      toast.error('Regeneration failed');
    }
  };

  const getImageUrl = (img: GeneratedImage) => {
    if (img.storage_path.startsWith('http')) {
      return img.storage_path;
    }
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/generated-images/${img.storage_path}`;
  };

  // For X threads (posts separated by ---), check per-tweet limits
  const isThread = draft.platform === 'x' && content.includes('\n---\n');
  const tweets = isThread
    ? content.split(/\n---\n/).map((t) => t.trim()).filter(Boolean)
    : [content];
  const tweetOverLimits = tweets.map((t) => t.length > config.charLimit);
  const charCount = isThread ? Math.max(...tweets.map((t) => t.length)) : content.length;
  const isOverLimit = isThread ? tweetOverLimits.some(Boolean) : content.length > config.charLimit;

  return (
    <Card className="h-full flex flex-col bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 shrink-0">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            {config.label} Draft
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Created {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        <Tabs defaultValue="edit" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="images">
              Images ({draft.images?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="variants" disabled={!draft.variants?.length}>
              Variants ({draft.variants?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="regenerate">AI</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="edit" className="h-full m-0 flex flex-col gap-4">
              <div className="flex-1 relative">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your post..."
                  className="h-full resize-none"
                />
                <div className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {isThread ? (
                    <span>
                      {tweets.length} tweets · longest {charCount} / {config.charLimit}
                      {tweetOverLimits.some(Boolean) && (
                        <span className="text-destructive ml-1">
                          ({tweetOverLimits.filter(Boolean).length} over limit)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>{content.length} / {config.charLimit}</span>
                  )}
                </div>
              </div>

              {/* Funnel Stage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  Funnel Stage
                </div>
                <Select
                  value={funnelStage || 'none'}
                  onValueChange={(val) => setFunnelStage(val === 'none' ? null : val as FunnelStage)}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    {funnelStageOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Hash className="h-4 w-4" />
                  Hashtags
                </div>
                <div className="flex flex-wrap gap-1">
                  {hashtags.map((tag, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setHashtags(hashtags.filter((_, j) => j !== i))}
                    >
                      #{tag}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                  {hashtags.length === 0 && (
                    <span className="text-xs text-muted-foreground">No hashtags</span>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="images" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {/* Generate button */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {hasImages ? `${draft.images!.length} image(s) generated` : 'No images yet'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateImages}
                      disabled={generatingImages}
                    >
                      {generatingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          {hasImages ? 'Generate More' : 'Generate Images'}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Image grid */}
                  {hasImages && (
                    <div className="grid grid-cols-2 gap-3">
                      {draft.images!.map((img) => (
                        <div
                          key={img.id}
                          className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group cursor-pointer"
                          onClick={() => setSelectedImage(img)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageUrl(img)}
                            alt="Generated"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="secondary" className="h-8 w-8">
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                          </div>
                          <Badge
                            variant="secondary"
                            className="absolute bottom-2 left-2 text-xs capitalize"
                          >
                            {img.style || 'minimal'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!hasImages && !generatingImages && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Generate AI images to accompany your post
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="variants" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {draft.variants?.map((variant, i) => (
                    <Card key={i} className="bg-muted/50">
                      <CardHeader className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{variant.label}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUseVariant(variant.content)}
                          >
                            Use this
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2 px-3">
                        <p className="text-sm whitespace-pre-wrap line-clamp-6">
                          {variant.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="regenerate" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 gap-2">
                  {regenerateActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                      onClick={() => handleRegenerate(action.id)}
                      disabled={regenerating !== null}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {regenerating === action.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <action.icon className="h-4 w-4" />
                        )}
                        <span className="font-medium">{action.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground text-left">
                        {action.description}
                      </span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between shrink-0">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSave} disabled={loading || !hasChanges}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            <Button onClick={() => setShowPublish(true)}>
              <Send className="mr-2 h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>

        <PublishDialog
          draft={{ ...draft, content_text: content, hashtags }}
          open={showPublish}
          onOpenChange={setShowPublish}
          onPublished={() => {
            // Optionally refresh or update state
          }}
        />

        {/* Image Preview Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => { setSelectedImage(null); setShowPrompt(false); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Image Preview
                {selectedImage?.style && (
                  <Badge variant="secondary" className="capitalize">
                    {selectedImage.style}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(selectedImage)}
                    alt="Generated"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPrompt((prev) => !prev)}
                  >
                    {showPrompt ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <span className="font-medium">Prompt</span>
                  </button>
                  {showPrompt && (
                    <p className="text-xs text-muted-foreground pl-4 whitespace-pre-wrap break-words">
                      {selectedImage.prompt}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Model:</span> {selectedImage.model} • 
                    <span className="font-medium"> Aspect:</span> {selectedImage.aspect_ratio}
                  </p>
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handleRegenerateImage(selectedImage.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(getImageUrl(selectedImage), '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                    <Button
                      variant="default"
                      onClick={async () => {
                        try {
                          const response = await fetch(getImageUrl(selectedImage));
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `image-${selectedImage.id}.png`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Image downloaded!');
                        } catch {
                          toast.error('Download failed');
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
