import React, { useState } from 'react';
import { Post, Comment, MOCK_USERS } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PostCardProps {
  post: Post;
  initiativeName?: string;
}

export function PostCard({ post, initiativeName }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments);
  const [newComment, setNewComment] = useState('');

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `nc-${Date.now()}`,
      postId: post.id,
      authorId: 'u1', // Mock current user
      authorName: 'Sarah Chen',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
      content: newComment,
      createdAt: 'Just now'
    };

    setComments([...comments, comment]);
    setNewComment('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-border shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-4 flex flex-row items-start gap-3 space-y-0">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">{post.authorName}</p>
                {initiativeName && (
                  <p className="text-xs text-muted-foreground">in <span className="font-medium text-primary">{initiativeName}</span></p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{post.createdAt}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-0 space-y-3">
          <p className="text-sm leading-relaxed whitespace-pre-line">{post.content}</p>
          {post.image && (
            <div className="rounded-xl overflow-hidden mt-3 border border-border">
              <img src={post.image} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 border-t flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`gap-2 ${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={handleLike}
                data-testid={`button-like-${post.id}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-xs">{likesCount}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowComments(!showComments)}
                data-testid={`button-comment-${post.id}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{comments.length}</span>
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          <AnimatePresence>
            {showComments && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full space-y-4 overflow-hidden"
              >
                <div className="space-y-3 pt-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarImage src={comment.authorAvatar} />
                        <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/50 p-3 rounded-lg rounded-tl-none">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs">{comment.authorName}</span>
                          <span className="text-[10px] text-muted-foreground">{comment.createdAt}</span>
                        </div>
                        <p className="text-muted-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleCommentSubmit} className="flex gap-2 items-end pt-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" />
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Textarea 
                      placeholder="Add a comment..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[40px] pr-10 resize-none py-2"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="absolute right-1 bottom-1 h-7 w-7"
                      disabled={!newComment.trim()}
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
