export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinedInitiatives: string[];
  role: 'user' | 'admin';
};

export type Initiative = {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  participantsCount: number;
  nextEvent?: string | null;
  location?: string | null;
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
  image?: string | null;
  likes: number;
  comments: Comment[];
  createdAt: string;
};
