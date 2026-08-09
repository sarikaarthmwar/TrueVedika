import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';

interface AuthPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the user successfully signs in or registers. */
  onAuthSuccess?: () => void;
  title?: string;
  description?: string;
}

/**
 * Shown whenever a guest (unauthenticated) user tries to take an action
 * that requires an account, e.g. clicking "Join" on an initiative.
 * Lets them sign in or create an account without leaving the page.
 */
export function AuthPromptDialog({
  open,
  onOpenChange,
  onAuthSuccess,
  title = 'Join the community',
  description = 'Create a free account or sign in to join this initiative.',
}: AuthPromptDialogProps) {
  const { login, register, isLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'signin') {
        await login(email, password, null);
      } else {
        await register(name, email, password, null);
      }
      resetForm();
      onOpenChange(false);
      onAuthSuccess?.();
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, '') || 'Something went wrong');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]" data-testid="dialog-auth-prompt">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="font-serif text-2xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="prompt-name">Full Name</Label>
              <Input
                id="prompt-name"
                type="text"
                placeholder="Jane Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-prompt-name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="prompt-email">Email</Label>
            <Input
              id="prompt-email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-prompt-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt-password">Password</Label>
            <Input
              id="prompt-password"
              type="password"
              placeholder="********"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-prompt-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full h-11 text-base"
            disabled={isLoading}
            data-testid="button-prompt-submit"
          >
            {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In & Join' : 'Create Account & Join'}
          </Button>
        </form>

        <button
          type="button"
          className="text-primary hover:underline text-sm text-center"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
          }}
          data-testid="button-prompt-toggle-mode"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </DialogContent>
    </Dialog>
  );
}
