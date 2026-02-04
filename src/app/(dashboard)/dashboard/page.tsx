'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Library,
  FileText,
  PenTool,
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { currentWorkspace } = useAuth();

  const quickActions = [
    {
      title: 'Add Source',
      description: 'Save a URL, note, or file to your library',
      icon: Library,
      href: '/dashboard/library?action=add',
      color: 'text-blue-500',
    },
    {
      title: 'Generate Content',
      description: 'Create optimized drafts for LinkedIn & X',
      icon: Zap,
      href: '/dashboard/generate',
      color: 'text-amber-500',
    },
    {
      title: 'View Drafts',
      description: 'Edit and publish your generated content',
      icon: PenTool,
      href: '/dashboard/drafts',
      color: 'text-emerald-500',
    },
    {
      title: 'Background Files',
      description: 'Configure tone, brand, and algorithms',
      icon: FileText,
      href: '/dashboard/kb',
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          {currentWorkspace?.name || 'Your'} content automation hub
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
            <Library className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500">+0</span> from last week
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500">0</span> ready to publish
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card
              key={action.href}
              className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors cursor-pointer group"
            >
              <Link href={action.href}>
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {action.title}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity / Getting Started */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Drafts
            </CardTitle>
            <CardDescription>Your latest generated content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PenTool className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No drafts yet. Generate your first content!
              </p>
              <Button asChild>
                <Link href="/dashboard/generate">
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              Getting Started
            </CardTitle>
            <CardDescription>Set up your content automation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Add your first source</p>
                <p className="text-xs text-muted-foreground">
                  Save URLs, notes, or upload files
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Configure your voice</p>
                <p className="text-xs text-muted-foreground">
                  Set up tone and brand guidelines
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Generate content</p>
                <p className="text-xs text-muted-foreground">
                  Create optimized posts with AI
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
