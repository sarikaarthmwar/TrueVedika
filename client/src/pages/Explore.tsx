import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_INITIATIVES, Initiative } from '@/lib/mockData';
import { InitiativeCard } from '@/components/ui/InitiativeCard';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Explore() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [localInitiatives, setLocalInitiatives] = useState<Initiative[]>(MOCK_INITIATIVES);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const categories = Array.from(new Set(localInitiatives.map(i => i.category)));

  const filteredInitiatives = localInitiatives.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase()) || 
                          i.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? i.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleCreateInitiative = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newInitiative: Initiative = {
      id: `temp-${Date.now()}`,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as any,
      participantsCount: 1,
      image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=1000',
      nextEvent: 'Just Started',
      location: formData.get('location') as string,
    };
    setLocalInitiatives(prev => [newInitiative, ...prev]);
    setIsCreateOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left space-y-2">
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              Discover Your Tribe
            </h1>
            <p className="text-lg text-muted-foreground">
              Find people who share your passions and start your journey together.
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full shadow-lg h-12 px-6 gap-2">
                <Plus className="w-5 h-5" />
                Create Initiative
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateInitiative}>
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">Start New Initiative</DialogTitle>
                  <DialogDescription>
                    Bring people together for a shared purpose. Fill in the details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" placeholder="e.g. Sunday Morning Yoga" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wellness">Wellness</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                        <SelectItem value="Fitness">Fitness</SelectItem>
                        <SelectItem value="Mindfulness">Mindfulness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" placeholder="e.g. City Park" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" placeholder="What is this initiative about?" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">Create Initiative</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              className="rounded-full"
            >
              All
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search initiatives..." 
              className="pl-9 rounded-full bg-white shadow-sm border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInitiatives.map(initiative => (
            <InitiativeCard key={initiative.id} initiative={initiative} />
          ))}
        </div>

        {filteredInitiatives.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No initiatives found matching your criteria.</p>
            <Button variant="link" onClick={() => { setSearch(''); setSelectedCategory(null); }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
