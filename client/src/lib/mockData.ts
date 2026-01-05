import cyclingImg from '@assets/generated_images/group_of_friends_cycling_in_nature.png';
import coffeeImg from '@assets/generated_images/morning_coffee_community_meetup.png';
import walkingImg from '@assets/generated_images/peaceful_silent_walk_in_nature.png';

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinedInitiatives: string[]; // IDs of joined initiatives
  role: 'user' | 'admin';
};

export type Initiative = {
  id: string;
  title: string;
  description: string;
  category: 'Wellness' | 'Social' | 'Fitness' | 'Mindfulness';
  image: string;
  participantsCount: number;
  nextEvent?: string;
  location?: string;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
};

export type Post = {
  id: string;
  initiativeId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  image?: string;
  likes: number;
  comments: Comment[];
  createdAt: string;
};

// Mock Users
export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    joinedInitiatives: ['i1', 'i2'],
    role: 'user',
  },
  {
    id: 'u2',
    name: 'Marcus Rivera',
    email: 'marcus@example.com',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150',
    joinedInitiatives: ['i3'],
    role: 'user',
  },
  {
    id: 'admin1',
    name: 'Admin User',
    email: 'admin@truvedika.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
    joinedInitiatives: [],
    role: 'admin',
  }
];

// Mock Initiatives
export const MOCK_INITIATIVES: Initiative[] = [
  {
    id: 'i1',
    title: 'Sunrise Cyclists',
    description: 'Start your day with energy! We meet every Tuesday and Thursday for a 20km ride through the city parks. All levels welcome.',
    category: 'Fitness',
    image: cyclingImg,
    participantsCount: 142,
    nextEvent: 'Tue, 6:00 AM',
    location: 'Central Park Entrance'
  },
  {
    id: 'i2',
    title: 'Mindful Mornings Coffee',
    description: 'No phones, just genuine connection. Join us for a morning brew and meaningful conversation before the workday begins.',
    category: 'Social',
    image: coffeeImg,
    participantsCount: 89,
    nextEvent: 'Wed, 8:00 AM',
    location: 'The Roasted Bean'
  },
  {
    id: 'i3',
    title: 'Silent Nature Walks',
    description: 'Reconnect with nature and yourself. A guided silent walking practice to cultivate presence and gratitude.',
    category: 'Mindfulness',
    image: walkingImg,
    participantsCount: 56,
    nextEvent: 'Sat, 7:00 AM',
    location: 'Greenwood Trail Head'
  },
  {
    id: 'i4',
    title: 'Gratitude Journaling',
    description: 'A 30-day challenge to build a habit of gratitude. Share your daily reflections and support others on their journey.',
    category: 'Wellness',
    image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1000',
    participantsCount: 210,
    nextEvent: 'Daily Online'
  }
];

// Mock Posts
export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    initiativeId: 'i1',
    authorId: 'u2',
    authorName: 'Marcus Rivera',
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150',
    content: 'Just finished the longest ride of my life! The sunrise was absolutely worth the early alarm. Who is joining on Thursday?',
    image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=800',
    likes: 24,
    comments: [
      {
        id: 'c1',
        postId: 'p1',
        authorId: 'u1',
        authorName: 'Sarah Chen',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        content: 'I\'ll be there! Great photo Marcus!',
        createdAt: '2 hours ago'
      }
    ],
    createdAt: '4 hours ago'
  },
  {
    id: 'p2',
    initiativeId: 'i2',
    authorId: 'u1',
    authorName: 'Sarah Chen',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    content: 'Today\'s discussion about "slowing down" really resonated with me. It\'s amazing how much more productive I feel when I\'m not rushing.',
    likes: 15,
    comments: [],
    createdAt: '1 day ago'
  }
];
