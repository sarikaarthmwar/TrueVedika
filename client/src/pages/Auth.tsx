import React from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';

import logoImg from '@/assets/logo.png';

export default function AuthPage() {
  const { login, register, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, '') || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-3xl opacity-60" />
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-3xl opacity-60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={logoImg} alt="TrueVedika" className="w-24 h-24 object-contain mb-4" />
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">TrueVedika</h1>
          <p className="text-muted-foreground italic font-serif">A Trusted Community for Wellness & Connection</p>
        </div>

        <Card className="border-border shadow-soft bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === 'signin' ? 'Enter your email and password to sign in' : 'Join the TrueVedika community'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jane Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 bg-white/50"
                    data-testid="input-name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-white/50"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white/50"
                  data-testid="input-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="text-primary hover:underline text-sm"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
              }}
              data-testid="button-toggle-mode"
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
            <p className="px-8 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
