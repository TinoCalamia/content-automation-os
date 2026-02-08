'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Zap,
  Linkedin,
  Twitter,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Library,
  Sparkles,
  Image,
  BarChart3,
  GitCompare,
  Workflow,
  Lightbulb,
  Quote,
  Minus,
  PenLine,
  Search,
  ImagePlus,
  Images,
  Check,
} from 'lucide-react';
import type { Source, Draft } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const platforms = [
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-500' },
  { id: 'x', label: 'X / Twitter', icon: Twitter, color: 'text-foreground' },
];

const angles = [
  { id: 'auto', label: 'Auto-select', description: 'Let AI choose the best angle' },
  { id: 'contrarian', label: 'Contrarian', description: 'Challenge common beliefs' },
  { id: 'how-to', label: 'How-to', description: 'Step-by-step guidance' },
  { id: 'lesson', label: 'Lesson Learned', description: 'Share a personal insight' },
  { id: 'framework', label: 'Framework', description: 'Introduce a mental model' },
  { id: 'story', label: 'Story', description: 'Narrative-driven content' },
  { id: 'tip', label: 'Quick Tip', description: 'Actionable advice' },
  { id: 'slay', label: 'SLAY', description: 'Story → Lesson → Action → You' },
];

const imageStyles = [
  { id: 'infographic', label: 'Infographic', description: 'Stats, charts, data viz', icon: BarChart3 },
  { id: 'comparison', label: 'Comparison', description: 'Side-by-side, before/after', icon: GitCompare },
  { id: 'flow', label: 'Flow/Process', description: 'Steps, journey, progression', icon: Workflow },
  { id: 'concept', label: 'Concept', description: 'Abstract, metaphorical', icon: Lightbulb },
  { id: 'quote', label: 'Quote', description: 'Text-friendly backdrop', icon: Quote },
  { id: 'minimal', label: 'Minimal', description: 'Clean, simple illustration', icon: Minus },
];

export default function GeneratePage() {
  const { currentWorkspace, session } = useAuth();
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'x']);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedAngle, setSelectedAngle] = useState('auto');
  const [selectedImageStyles, setSelectedImageStyles] = useState<string[]>(['infographic', 'comparison']);
  const [generateImages, setGenerateImages] = useState(true);
  const [imageSourceMode, setImageSourceMode] = useState<'generate' | 'original'>('generate');
  const [selectedSourceImages, setSelectedSourceImages] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ platform: string; draftId: string }[]>([]);
  // Content input mode: 'sources' (from library) or 'custom' (write your own)
  const [inputMode, setInputMode] = useState<'sources' | 'custom'>('sources');
  const [customText, setCustomText] = useState('');
  // Source search
  const [sourceSearch, setSourceSearch] = useState('');

  const fetchSources = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoadingSources(true);
    try {
      const response = await fetch(`/api/sources?workspace_id=${currentWorkspace.id}&status=enriched`);
      const data = await response.json();

      if (data.success) {
        setSources(data.data.sources);
      }
    } catch (error) {
      logger.error('Failed to fetch sources', { error });
    } finally {
      setLoadingSources(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Filter sources based on search query
  const filteredSources = useMemo(() => {
    if (!sourceSearch.trim()) return sources;
    const query = sourceSearch.toLowerCase();
    return sources.filter((source) => {
      const title = (source.title || '').toLowerCase();
      const summary = (source.summary || '').toLowerCase();
      return title.includes(query) || summary.includes(query);
    });
  }, [sources, sourceSearch]);

  // Compute available images from selected sources
  const availableSourceImages = useMemo(() => {
    if (inputMode !== 'sources' || selectedSources.length === 0) return [];
    return sources
      .filter((s) => selectedSources.includes(s.id) && s.thumbnail_url)
      .map((s) => ({
        sourceId: s.id,
        url: s.thumbnail_url!,
        title: s.title || 'Untitled',
      }));
  }, [sources, selectedSources, inputMode]);

  // Reset selected source images when available images change
  useEffect(() => {
    setSelectedSourceImages((prev) =>
      prev.filter((url) => availableSourceImages.some((img) => img.url === url))
    );
  }, [availableSourceImages]);

  // Auto-switch to generate mode if no source images available
  useEffect(() => {
    if (imageSourceMode === 'original' && availableSourceImages.length === 0) {
      setImageSourceMode('generate');
    }
  }, [availableSourceImages, imageSourceMode]);

  const toggleSourceImage = (url: string) => {
    setSelectedSourceImages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((s) => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const toggleImageStyle = (styleId: string) => {
    setSelectedImageStyles((prev) => {
      if (prev.includes(styleId)) {
        // Don't allow removing the last style
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== styleId);
      }
      // Max 3 styles
      if (prev.length >= 3) return prev;
      return [...prev, styleId];
    });
  };

  const handleGenerate = async () => {
    if (!currentWorkspace || selectedPlatforms.length === 0) return;

    setGenerating(true);
    setResults([]);

    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

    try {
      const generationPromises = selectedPlatforms.map(async (platform) => {
        const response = await fetch(`${fastApiUrl}/api/generation/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            platform,
            source_ids: inputMode === 'sources' && selectedSources.length > 0 ? selectedSources : undefined,
            custom_text: inputMode === 'custom' && customText.trim() ? customText.trim() : undefined,
            angle: selectedAngle !== 'auto' ? selectedAngle : undefined,
            generate_images: generateImages,
            image_source: generateImages ? imageSourceMode : 'generate',
            image_styles: generateImages && imageSourceMode === 'generate' ? selectedImageStyles : undefined,
            image_aspect_ratio: '1:1',
            source_image_urls: generateImages && imageSourceMode === 'original' && selectedSourceImages.length > 0
              ? selectedSourceImages
              : undefined,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || `Failed to generate for ${platform}`);
        }

        return { platform, draftId: data.data.draft_id };
      });

      const generatedResults = await Promise.all(generationPromises);
      setResults(generatedResults);

      const imageCount = generateImages
        ? imageSourceMode === 'original'
          ? selectedSourceImages.length
          : generatedResults.length * selectedImageStyles.length
        : 0;
      toast.success('Content generated!', {
        description: `Created ${generatedResults.length} draft(s)${imageCount > 0 ? ` with ${imageCount} images` : ''}`,
      });
    } catch (error) {
      logger.error('Generation failed', { error });
      toast.error('Generation failed', {
        description: error instanceof Error ? error.message : 'Check if FastAPI is running',
      });
    } finally {
      setGenerating(false);
    }
  };

  const hasResults = results.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Generate Content</h1>
        <p className="text-muted-foreground">
          Create platform-optimized drafts using your sources and brand voice
        </p>
      </div>

      {!hasResults ? (
        <div className="space-y-6">
          {/* Platform Selection */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Select Platforms</CardTitle>
              <CardDescription>Choose where to publish</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {platforms.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <Button
                      key={platform.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`flex-1 h-auto py-4 ${isSelected ? '' : 'bg-card/50'}`}
                      onClick={() => togglePlatform(platform.id)}
                    >
                      <platform.icon className={`mr-2 h-5 w-5 ${isSelected ? '' : platform.color}`} />
                      {platform.label}
                      {isSelected && <CheckCircle2 className="ml-2 h-4 w-4" />}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Angle Selection */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Content Angle</CardTitle>
              <CardDescription>Choose the approach for your content</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedAngle} onValueChange={setSelectedAngle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {angles.map((angle) => (
                    <SelectItem key={angle.id} value={angle.id}>
                      <div className="flex flex-col">
                        <span>{angle.label}</span>
                        <span className="text-xs text-muted-foreground">{angle.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Image Selection */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Images
                  </CardTitle>
                  <CardDescription>
                    {imageSourceMode === 'generate'
                      ? `Generate ${selectedImageStyles.length} on-brand images per draft`
                      : `Use ${selectedSourceImages.length || 0} image${selectedSourceImages.length !== 1 ? 's' : ''} from your sources`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="generate-images" className="text-sm text-muted-foreground">
                    Include Images
                  </Label>
                  <Checkbox
                    id="generate-images"
                    checked={generateImages}
                    onCheckedChange={(checked) => setGenerateImages(checked === true)}
                  />
                </div>
              </div>
            </CardHeader>
            {generateImages && (
              <CardContent className="space-y-4">
                {/* Image source mode toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={imageSourceMode === 'generate' ? 'default' : 'outline'}
                    size="sm"
                    className={imageSourceMode === 'generate' ? '' : 'bg-card/50'}
                    onClick={() => setImageSourceMode('generate')}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Generate New
                  </Button>
                  <Button
                    variant={imageSourceMode === 'original' ? 'default' : 'outline'}
                    size="sm"
                    className={imageSourceMode === 'original' ? '' : 'bg-card/50'}
                    onClick={() => setImageSourceMode('original')}
                    disabled={availableSourceImages.length === 0}
                  >
                    <Images className="mr-2 h-4 w-4" />
                    From Sources
                    {availableSourceImages.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
                        {availableSourceImages.length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {imageSourceMode === 'generate' ? (
                  /* AI Image style selection */
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select 1-3 image styles to generate (images follow your brand guidelines):
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {imageStyles.map((style) => {
                        const isSelected = selectedImageStyles.includes(style.id);
                        const StyleIcon = style.icon;
                        return (
                          <Button
                            key={style.id}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className={`h-auto py-3 flex flex-col items-center gap-1 ${
                              isSelected ? '' : 'bg-card/50'
                            }`}
                            onClick={() => toggleImageStyle(style.id)}
                          >
                            <StyleIcon className="h-4 w-4" />
                            <span className="text-xs font-medium">{style.label}</span>
                            <span className="text-[10px] text-muted-foreground">{style.description}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Original source image selection */
                  <div>
                    {availableSourceImages.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Images className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">
                          No images available from selected sources.
                        </p>
                        <p className="text-xs mt-1">
                          Select sources that have thumbnail images, or switch to &quot;Generate New&quot;.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Pick which source images to use with your draft:
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {availableSourceImages.map((img) => {
                            const isSelected = selectedSourceImages.includes(img.url);
                            return (
                              <div
                                key={img.url}
                                className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-primary ring-2 ring-primary/20'
                                    : 'border-border/50 hover:border-border'
                                }`}
                                onClick={() => toggleSourceImage(img.url)}
                              >
                                <div className="aspect-video bg-muted">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={img.url}
                                    alt={img.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div className="p-2">
                                  <p className="text-xs font-medium truncate">{img.title}</p>
                                </div>
                                {isSelected && (
                                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Content Input Mode */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Content Input</CardTitle>
              <CardDescription>
                Choose how to provide content for generation
              </CardDescription>
              <div className="flex gap-2 pt-2">
                <Button
                  variant={inputMode === 'sources' ? 'default' : 'outline'}
                  size="sm"
                  className={inputMode === 'sources' ? '' : 'bg-card/50'}
                  onClick={() => setInputMode('sources')}
                >
                  <Library className="mr-2 h-4 w-4" />
                  From Sources
                </Button>
                <Button
                  variant={inputMode === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  className={inputMode === 'custom' ? '' : 'bg-card/50'}
                  onClick={() => setInputMode('custom')}
                >
                  <PenLine className="mr-2 h-4 w-4" />
                  Custom Text
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inputMode === 'custom' ? (
                <div className="space-y-2">
                  <Label htmlFor="custom-text">Your Content / Idea</Label>
                  <Textarea
                    id="custom-text"
                    placeholder="Write your thoughts, ideas, or key points here. The AI will transform this into platform-optimized content..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    rows={6}
                    className="resize-y"
                    disabled={generating}
                  />
                  <p className="text-xs text-muted-foreground">
                    {customText.length > 0
                      ? `${customText.length} characters`
                      : 'Tip: Include key points, insights, or a rough draft and the AI will polish it'}
                  </p>
                </div>
              ) : (
                <>
                  {loadingSources ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : sources.length === 0 ? (
                    <div className="text-center py-8">
                      <Library className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground mb-4">
                        No enriched sources yet. Add and enrich sources first.
                      </p>
                      <Button variant="outline" onClick={() => router.push('/dashboard/library')}>
                        Go to Library
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Search bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search sources..."
                          value={sourceSearch}
                          onChange={(e) => setSourceSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {/* Source count */}
                      {sourceSearch.trim() && (
                        <p className="text-xs text-muted-foreground">
                          Showing {filteredSources.length} of {sources.length} sources
                        </p>
                      )}
                      {selectedSources.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedSources.length} source{selectedSources.length > 1 ? 's' : ''} selected
                        </p>
                      )}
                      {/* Source list */}
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-2">
                          {filteredSources.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No sources match your search
                            </p>
                          ) : (
                            filteredSources.map((source) => (
                              <div
                                key={source.id}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                                onClick={() => toggleSource(source.id)}
                              >
                                <Checkbox
                                  checked={selectedSources.includes(source.id)}
                                  onCheckedChange={() => toggleSource(source.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {source.title || 'Untitled'}
                                  </p>
                                  {source.summary && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {source.summary}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || selectedPlatforms.length === 0}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Generate {selectedPlatforms.length} Draft{selectedPlatforms.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      ) : (
        /* Results */
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Content Generated!</CardTitle>
            <CardDescription>
              Your drafts are ready to review and publish
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {results.map((result) => {
                const platform = platforms.find((p) => p.id === result.platform);
                if (!platform) return null;

                return (
                  <div
                    key={result.draftId}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-background flex items-center justify-center ${platform.color}`}>
                        <platform.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{platform.label} Draft</p>
                        <p className="text-xs text-muted-foreground">Ready to edit</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setResults([]);
                  setSelectedSources([]);
                  setCustomText('');
                }}
              >
                Generate More
              </Button>
              <Button className="flex-1" onClick={() => router.push('/dashboard/drafts')}>
                View Drafts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
