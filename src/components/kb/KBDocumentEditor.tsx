'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Save,
  Loader2,
  History,
  RotateCcw,
  Eye,
  FileText,
  X,
} from 'lucide-react';
import type { KBDocument } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface KBDocumentEditorProps {
  document: KBDocument | null;
  isNew?: boolean;
  workspaceId: string;
  onSave: (doc: KBDocument) => void;
  onClose: () => void;
}

const documentTypes = [
  { value: 'tone_of_voice', label: 'Tone of Voice', description: 'Your brand voice and writing style' },
  { value: 'brand_guidelines', label: 'Brand Guidelines', description: 'Visual and messaging standards' },
  { value: 'linkedin_algorithm', label: 'LinkedIn Algorithm', description: 'Platform-specific post structure' },
  { value: 'x_algorithm', label: 'X Algorithm', description: 'X/Twitter post optimization rules' },
  { value: 'quality_rubric', label: 'Quality Rubric', description: 'Content quality evaluation criteria' },
];

export function KBDocumentEditor({
  document,
  isNew,
  workspaceId,
  onSave,
  onClose,
}: KBDocumentEditorProps) {
  const [loading, setSaving] = useState(false);
  const [key, setKey] = useState(document?.key || '');
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.content_md || '');
  const [isActive, setIsActive] = useState(document?.is_active ?? true);
  const [showVersions, setShowVersions] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('edit');

  const previousVersions = document?.previous_versions as Array<{
    version: number;
    content_md: string;
    updated_at: string;
  }> || [];

  const hasChanges = isNew || 
    content !== document?.content_md ||
    title !== document?.title ||
    isActive !== document?.is_active;

  const handleSave = async () => {
    if (!key || !title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const url = isNew ? '/api/kb-documents' : `/api/kb-documents/${document?.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const body = isNew
        ? { workspace_id: workspaceId, key, title, content_md: content, is_active: isActive }
        : { title, content_md: content, is_active: isActive };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      toast.success(isNew ? 'Document created!' : 'Document saved!');
      onSave(data.data.document);
    } catch (error) {
      logger.error('Failed to save document', { error });
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (version: number) => {
    if (!document) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/kb-documents/${document.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setContent(data.data.document.content_md);
      toast.success(`Rolled back to version ${version}`);
      onSave(data.data.document);
      setShowVersions(false);
    } catch (error) {
      logger.error('Failed to rollback', { error });
      toast.error('Failed to rollback');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = documentTypes.find((t) => t.value === key);

  return (
    <Card className="h-full flex flex-col bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 shrink-0">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            {isNew ? 'New Document' : document?.title}
          </CardTitle>
          {!isNew && document && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">v{document.version}</Badge>
              <span>Last updated {formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="space-y-2">
            <Label htmlFor="type">Document Type</Label>
            <Select value={key} onValueChange={setKey} disabled={!isNew}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <Label>Active</Label>
            <p className="text-xs text-muted-foreground">
              Only active documents are used in generation
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {/* Editor Tabs */}
        <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as typeof previewMode)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
            </TabsList>
            {!isNew && previousVersions.length > 0 && (
              <Dialog open={showVersions} onOpenChange={setShowVersions}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <History className="mr-2 h-4 w-4" />
                    History ({previousVersions.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Version History</DialogTitle>
                    <DialogDescription>
                      Rollback to a previous version of this document
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {previousVersions.map((v) => (
                        <div
                          key={v.version}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <span className="font-medium">Version {v.version}</span>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(v.updated_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRollback(v.version)}
                            disabled={loading}
                          >
                            <RotateCcw className="mr-2 h-3 w-3" />
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="edit" className="h-full m-0">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your content in Markdown..."
                className="h-full resize-none font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0">
              <ScrollArea className="h-full border border-border rounded-md p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{content || '*No content yet*'}</ReactMarkdown>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="split" className="h-full m-0">
              <div className="grid grid-cols-2 gap-4 h-full">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your content in Markdown..."
                  className="h-full resize-none font-mono text-sm"
                />
                <ScrollArea className="h-full border border-border rounded-md p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{content || '*No content yet*'}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !hasChanges}>
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
        </div>
      </CardContent>
    </Card>
  );
}
