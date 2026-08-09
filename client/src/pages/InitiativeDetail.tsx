import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Initiative, Post } from '@/lib/mockData';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PostCard } from '@/components/ui/PostCard';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AuthPromptDialog } from '@/components/ui/AuthPromptDialog';
import { ShareDialog } from '@/components/ui/ShareDialog';
import { Users, MapPin, Calendar, ArrowLeft, Image as ImageIcon, Send, Share2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function InitiativeDetail() {
  const [, params] = useRoute('/initiative/:id');
  const { user, joinInitiative, leaveInitiative } = useAuth();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState('');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const { data: initiative, isLoading: loadingInitiative } = useQuery<Initiative>({
    queryKey: ['/api/initiatives', id],
    queryFn: async () => {
      const res = await fetch(`/api/initiatives/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load initiative');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['/api/initiatives', id, 'posts'],
    queryFn: async () => {
      const res = await fetch(`/api/initiatives/${id}/posts`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load posts');
      return res.json();
    },
    enabled: !!id,
  });

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/initiatives/${id}/posts`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/initiatives', id, 'posts'] });
      setNewPostContent('');
    },
  });

  if (loadingInitiative) {
    return <AppLayout><div className="p-8">Loading...</div></AppLayout>;
  }
  if (!initiative) return <AppLayout><div className="p-8">Initiative not found</div></AppLayout>;

  const isJoined = user?.joinedInitiatives?.includes(initiative.id);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : `/initiative/${initiative.id}`;

  const handleJoinToggle = async () => {
    if (isJoined) {
      await leaveInitiative(initiative.id);
      queryClient.invalidateQueries({ queryKey: ['/api/initiatives'] });
      return;
    }
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    await joinInitiative(initiative.id);
    queryClient.invalidateQueries({ queryKey: ['/api/initiatives'] });
  };

  const handleAuthSuccess = async () => {
    await joinInitiative(initiative.id);
    queryClient.invalidateQueries({ queryKey: ['/api/initiatives'] });
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !user) return;
    postMutation.mutate(newPostContent);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto pb-20">
        <Link href="/explore">
          <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Explore
          </Button>
        </Link>

        <div className="relative h-[300px] md:h-[400px] rounded-3xl overflow-hidden mb-8 shadow-xl">
          <img
            src={initiative.image}
            alt={initiative.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white w-full">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <Badge className="mb-3 bg-primary/80 backdrop-blur hover:bg-primary border-none">
                  {initiative.category}
                </Badge>
                <h1 className="text-3xl md:text-5xl font-serif font-bold mb-2">{initiative.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm md:text-base text-white/90">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{initiative.participantsCount} participants</span>
                  </div>
                  {initiative.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{initiative.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  onClick={() => setShowShare(true)}
                  data-testid="button-share-initiative"
                >
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
                <Button
                  size="lg"
                  className={`min-w-[120px] ${isJoined ? 'bg-white/20 hover:bg-white/30 text-white border-none' : 'bg-primary hover:bg-primary/90 text-white border-none'}`}
                  onClick={handleJoinToggle}
                  data-testid="button-join-toggle"
                >
                  {isJoined ? 'Leave' : 'Join Community'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
              <h2 className="text-xl font-bold mb-3 font-serif">About this Initiative</h2>
              <p className="text-muted-foreground leading-relaxed">
                {initiative.description}
              </p>
            </section>

            {isJoined && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{user?.name[0]}</AvatarFallback>
                  </Avatar>
                  <form onSubmit={handlePostSubmit} className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Share your journey, updates, or photos..."
                      className="min-h-[100px] resize-none border-border/50 bg-muted/20 focus:bg-white transition-colors"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                        <ImageIcon className="w-4 h-4 mr-2" /> Add Photo
                      </Button>
                      <Button type="submit" disabled={!newPostContent.trim() || postMutation.isPending}>
                        {postMutation.isPending ? 'Posting...' : 'Post'} <Send className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                  </form>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-lg font-semibold mb-4">Community Posts</h3>
              {posts.length > 0 ? (
                <div>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-muted">
                  <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-secondary/5 rounded-2xl p-6 border border-secondary/10 sticky top-24">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-secondary" />
                Upcoming Events
              </h3>
              {initiative.nextEvent ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-border/50 mb-3">
                  <p className="font-semibold text-lg text-primary">{initiative.nextEvent}</p>
                  <p className="text-sm text-muted-foreground">Regular Meetup</p>
                  <Button variant="outline" size="sm" className="w-full mt-3">Add to Calendar</Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No upcoming events scheduled.</p>
              )}

              <div className="mt-6">
                <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Community Guidelines</h4>
                <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-4">
                  <li>Be respectful and kind.</li>
                  <li>Keep posts relevant to the initiative.</li>
                  <li>Support each other's growth.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthPromptDialog
        open={showAuthPrompt}
        onOpenChange={setShowAuthPrompt}
        onAuthSuccess={handleAuthSuccess}
        title="Join the community"
        description={`Create a free account or sign in to join "${initiative.title}".`}
      />

      <ShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        title={initiative.title}
        description={initiative.description}
        url={shareUrl}
      />
    </AppLayout>
  );
}
