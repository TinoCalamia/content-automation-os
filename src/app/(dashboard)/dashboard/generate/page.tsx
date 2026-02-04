'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ platform: string; draftId: string }[]>([]);

  const fetchSources = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoadingSources(true);
    try {
      const response = await fetch(`/api/sources?workspace_id=${currentWorkspace.id}&status=enriched`);
      const data = await response.json();

      if (data.success) {
        setSources(data.data.sources.slice(0, 10)); // Get top 10 recent enriched sources
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
            source_ids: selectedSources.length > 0 ? selectedSources : undefined,
            angle: selectedAngle !== 'auto' ? selectedAngle : undefined,
            generate_images: generateImages,
            image_styles: generateImages ? selectedImageStyles : undefined,
            image_aspect_ratio: '1:1',
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

      const imageCount = generateImages ? generatedResults.length * selectedImageStyles.length : 0;
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

          {/* Image Style Selection */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Image Generation
                  </CardTitle>
                  <CardDescription>
                    Generate {selectedImageStyles.length} on-brand images per draft
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="generate-images" className="text-sm text-muted-foreground">
                    Generate Images
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
              <CardContent>
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
              </CardContent>
            )}
          </Card>

          {/* Source Selection */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Select Sources (Optional)</CardTitle>
              <CardDescription>
                Choose specific sources to use, or leave empty to auto-select
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {sources.map((source) => (
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
                    ))}
                  </div>
                </ScrollArea>
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
