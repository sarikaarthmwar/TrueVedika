import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  Copy,
  Check,
  Share2,
} from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Full absolute URL to the initiative page. */
  url: string;
  /** Optional short description used in the share text. */
  description?: string;
}

export function ShareDialog({ open, onOpenChange, title, url, description }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const shareText = description ? `${title} — ${description}` : title;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      // user cancelled or share failed silently — no action needed
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — fall back silently
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      className: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      className: 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20',
    },
    {
      name: 'Twitter / X',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      className: 'bg-foreground/10 text-foreground hover:bg-foreground/20',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" data-testid="dialog-share">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Share this initiative</DialogTitle>
          <DialogDescription>Invite others to join "{title}"</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          {shareOptions.map((option) => (
            <a
              key={option.name}
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-colors ${option.className}`}
              data-testid={`link-share-${option.name.toLowerCase().replace(/[\s/]+/g, '-')}`}
            >
              <option.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{option.name}</span>
            </a>
          ))}

          {/* Instagram has no web share URL — direct users to copy the link
              and paste it into a Story/DM/bio, or use native share on mobile. */}
          <button
            type="button"
            onClick={canNativeShare ? handleNativeShare : handleCopy}
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-colors bg-gradient-to-br from-[#F58529]/10 via-[#DD2A7B]/10 to-[#8134AF]/10 text-[#DD2A7B] hover:opacity-80"
            data-testid="link-share-instagram"
          >
            <Instagram className="w-6 h-6" />
            <span className="text-xs font-medium">Instagram</span>
          </button>
        </div>

        {canNativeShare && (
          <Button variant="outline" className="w-full gap-2" onClick={handleNativeShare} data-testid="button-native-share">
            <Share2 className="w-4 h-4" />
            More sharing options
          </Button>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Input readOnly value={url} className="text-sm" data-testid="input-share-url" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleCopy}
            aria-label="Copy link"
            data-testid="button-copy-link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
