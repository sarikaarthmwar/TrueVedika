import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/authContext';
import { 
  Home, 
  Compass, 
  LogOut, 
  Menu, 
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

import logoImg from '@/assets/logo.png';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link href="/">
          <div className="flex items-center gap-3 group cursor-pointer">
            <img src={logoImg} alt="TrueVedika" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-serif font-bold text-primary group-hover:text-primary/80 transition-colors">
              TrueVedika
            </h1>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <Link href="/">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
            location === '/' 
              ? 'bg-primary/10 text-primary font-medium' 
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}>
            <Home className="w-5 h-5" />
            My Community
          </div>
        </Link>
        <Link href="/explore">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
            location === '/explore' || location.startsWith('/initiative')
              ? 'bg-primary/10 text-primary font-medium' 
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}>
            <Compass className="w-5 h-5" />
            Explore Initiatives
          </div>
        </Link>
        {user?.role === 'admin' && (
           <Link href="/admin">
           <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
             location === '/admin' 
               ? 'bg-primary/10 text-primary font-medium' 
               : 'text-muted-foreground hover:bg-muted hover:text-foreground'
           }`}>
             <ShieldCheck className="w-5 h-5" />
             Moderation
           </div>
         </Link>
        )}
      </nav>

      <div className="p-4 border-t mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-muted transition-colors text-left">
              <Avatar className="w-10 h-10 border border-border">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{(user?.name || 'G').charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Guest User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || 'guest@truevedika.com'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-sidebar fixed h-full z-10">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="TrueVedika" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-serif font-bold text-primary">TrueVedika</h1>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
