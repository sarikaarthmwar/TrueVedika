import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_INITIATIVES } from '@/lib/mockData';
import { InitiativeCard } from '@/components/ui/InitiativeCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Explore() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(MOCK_INITIATIVES.map(i => i.category)));

  const filteredInitiatives = MOCK_INITIATIVES.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase()) || 
                          i.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? i.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
            Discover Your Tribe
          </h1>
          <p className="text-lg text-muted-foreground">
            Find people who share your passions and start your journey together.
          </p>
          
          <div className="relative max-w-md mx-auto mt-6">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search for cycling, meditation, etc..." 
              className="pl-10 h-12 rounded-full bg-white shadow-sm border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
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
