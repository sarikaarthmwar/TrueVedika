import React from 'react';
import { Initiative } from '@/lib/mockData';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Calendar } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/authContext';

interface InitiativeCardProps {
  initiative: Initiative;
}

export function InitiativeCard({ initiative }: InitiativeCardProps) {
  const { user, joinInitiative } = useAuth();
  const isJoined = user?.joinedInitiatives && user.joinedInitiatives.includes(initiative.id);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isJoined) {
      await joinInitiative(initiative.id);
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-300 border-border bg-white group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={initiative.image}
          alt={initiative.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-foreground hover:bg-white">
            {initiative.category}
          </Badge>
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <h3 className="font-serif text-xl font-bold leading-tight">{initiative.title}</h3>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex-1 space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {initiative.description}
        </p>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            <span>{initiative.participantsCount} members</span>
          </div>
          {initiative.nextEvent && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Next: {initiative.nextEvent}</span>
            </div>
          )}
          {initiative.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>{initiative.location}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/initiative/${initiative.id}`}>View Details</Link>
          </Button>
          <Button
            className={`w-full ${isJoined ? 'bg-muted text-muted-foreground hover:bg-muted' : ''}`}
            onClick={handleJoin}
            disabled={isJoined}
          >
            {isJoined ? 'Joined' : 'Join'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
