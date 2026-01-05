import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/authContext';
import { MOCK_INITIATIVES, MOCK_POSTS } from '@/lib/mockData';
import { PostCard } from '@/components/ui/PostCard';
import { InitiativeCard } from '@/components/ui/InitiativeCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function Dashboard() {
  const { user } = useAuth();
  
  if (!user) return null;

  const joinedInitiatives = MOCK_INITIATIVES.filter(i => 
    user.joinedInitiatives.includes(i.id)
  );

  const feedPosts = MOCK_POSTS.filter(p => 
    user.joinedInitiatives.includes(p.initiativeId)
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Section */}
        <section className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your community today.
          </p>
        </section>

        {/* My Initiatives Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Initiatives</h2>
            <Link href="/explore">
              <Button variant="ghost" className="text-primary hover:text-primary/80" size="sm">
                Find More <Plus className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          
          {joinedInitiatives.length > 0 ? (
             <ScrollArea className="w-full whitespace-nowrap rounded-xl pb-4">
               <div className="flex w-max space-x-4 p-1">
                 {joinedInitiatives.map(initiative => (
                   <div key={initiative.id} className="w-[300px]">
                     <InitiativeCard initiative={initiative} />
                   </div>
                 ))}
               </div>
               <ScrollBar orientation="horizontal" />
             </ScrollArea>
          ) : (
            <div className="bg-muted/30 border border-dashed rounded-xl p-8 text-center space-y-4">
              <p className="text-muted-foreground">You haven't joined any initiatives yet.</p>
              <Link href="/explore">
                <Button>Explore Communities</Button>
              </Link>
            </div>
          )}
        </section>

        {/* Community Feed Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Community Feed</h2>
            
            {feedPosts.length > 0 ? (
              <div className="space-y-6">
                {feedPosts.map(post => {
                  const initiative = MOCK_INITIATIVES.find(i => i.id === post.initiativeId);
                  return (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      initiativeName={initiative?.title}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No recent activity. Join an initiative to see posts!</p>
              </div>
            )}
          </div>

          {/* Sidebar / Suggestions */}
          <div className="hidden md:block space-y-6">
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <h3 className="font-serif font-bold text-lg mb-2 text-primary">Daily Inspiration</h3>
              <p className="text-sm text-muted-foreground italic">
                "The power of community is that we can do together what we cannot do alone."
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Suggested for you</h3>
              <div className="space-y-4">
                {MOCK_INITIATIVES.filter(i => !user.joinedInitiatives.includes(i.id)).slice(0, 2).map(initiative => (
                  <div key={initiative.id} className="flex gap-3 items-start">
                    <img src={initiative.image} alt={initiative.title} className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <h4 className="font-medium text-sm">{initiative.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{initiative.category}</p>
                      <Link href={`/initiative/${initiative.id}`}>
                        <span className="text-xs text-primary hover:underline cursor-pointer">View</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
