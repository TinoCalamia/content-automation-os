'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { KBDocumentEditor } from '@/components/kb/KBDocumentEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  FileText,
  Mic,
  Palette,
  Linkedin,
  Twitter,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { KBDocument } from '@/types/database';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';

const documentTypeConfig: Record<string, { icon: React.ElementType; color: string; description: string }> = {
  tone_of_voice: {
    icon: Mic,
    color: 'text-amber-500',
    description: 'Your brand voice and writing style guidelines',
  },
  brand_guidelines: {
    icon: Palette,
    color: 'text-purple-500',
    description: 'Visual and messaging brand standards',
  },
  linkedin_algorithm: {
    icon: Linkedin,
    color: 'text-blue-500',
    description: 'LinkedIn-specific post optimization rules',
  },
  x_algorithm: {
    icon: Twitter,
    color: 'text-foreground',
    description: 'X/Twitter post optimization rules',
  },
  quality_rubric: {
    icon: ClipboardCheck,
    color: 'text-emerald-500',
    description: 'Content quality evaluation criteria',
  },
};

export default function KBPage() {
  const { currentWorkspace } = useAuth();
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<KBDocument | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/kb-documents?workspace_id=${currentWorkspace.id}`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data.documents);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('Failed to fetch KB documents', { error });
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSave = (doc: KBDocument) => {
    if (isCreating) {
      setDocuments([...documents, doc]);
      setIsCreating(false);
    } else {
      setDocuments(documents.map((d) => (d.id === doc.id ? doc : d)));
    }
    setSelectedDoc(doc);
  };

  const handleClose = () => {
    setSelectedDoc(null);
    setIsCreating(false);
  };

  // Get list of existing document keys
  const existingKeys = documents.map((d) => d.key);
  const availableTypes = Object.keys(documentTypeConfig).filter(
    (key) => !existingKeys.includes(key as KBDocument['key'])
  );

  return (
    <div className="h-full flex">
      {/* Document List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Background Files</h1>
              <p className="text-muted-foreground">
                Configure your tone, brand, and platform guidelines
              </p>
            </div>
            {availableTypes.length > 0 && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Document
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[140px]" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No documents yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first background document to guide content generation
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Document
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {documents.map((doc) => {
                const config = documentTypeConfig[doc.key] || {
                  icon: FileText,
                  color: 'text-muted-foreground',
                  description: '',
                };
                const Icon = config.icon;

                return (
                  <Card
                    key={doc.id}
                    className={`bg-card/50 border-border/50 hover:bg-card/80 transition-colors cursor-pointer ${
                      selectedDoc?.id === doc.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setIsCreating(false);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.is_active ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <XCircle className="h-3 w-3 text-muted-foreground" />
                              Inactive
                            </Badge>
                          )}
                          <Badge variant="secondary">v{doc.version}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-base mb-1">{doc.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {config.description}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground mt-2">
                        Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Add more cards for missing document types */}
              {availableTypes.map((key) => {
                const config = documentTypeConfig[key];
                const Icon = config.icon;

                return (
                  <Card
                    key={key}
                    className="bg-card/30 border-dashed border-border/50 hover:bg-card/50 transition-colors cursor-pointer"
                    onClick={() => setIsCreating(true)}
                  >
                    <CardHeader className="pb-2">
                      <div className={`w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center ${config.color} opacity-50`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-base mb-1 text-muted-foreground">
                        Add {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {config.description}
                      </CardDescription>
                      <p className="text-xs text-primary mt-2">
                        + Click to create
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      {(selectedDoc || isCreating) && currentWorkspace && (
        <div className="w-[500px] border-l border-border bg-background">
          <KBDocumentEditor
            document={isCreating ? null : selectedDoc}
            isNew={isCreating}
            workspaceId={currentWorkspace.id}
            onSave={handleSave}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}
