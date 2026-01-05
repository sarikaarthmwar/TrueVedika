import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Heart, Users, Shield, Zap } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import heroImage from '@/assets/stock_images/modern_community_wel_bf655337.jpg';
import featureImage from '@/assets/stock_images/modern_community_wel_f66c7ff1.jpg';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-morphism border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="TrueVedika" className="w-8 h-8 object-contain" />
          <span className="text-xl font-serif font-bold text-primary">TrueVedika</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth">
            <Button variant="ghost" className="text-sm font-medium">Log in</Button>
          </Link>
          <Link href="/auth">
            <Button className="rounded-full px-6 text-sm font-medium">Join Community</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
              <Zap className="w-3 h-3" />
              Building Trusted Communities
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.1] text-foreground">
              Connecting Hearts, <br />
              <span className="text-primary/60 italic">Building Wellness.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              TrueVedika is a trusted sanctuary where individuals gather to build shared initiatives for wellness, growth, and authentic connection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth">
                <Button size="lg" className="rounded-full px-8 h-14 text-lg font-medium group">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg font-medium">
                  Explore Initiatives
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl -rotate-3 translate-x-4 translate-y-4 -z-10" />
            <img 
              src={heroImage} 
              alt="Community Wellness" 
              className="rounded-3xl shadow-2xl w-full h-[500px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* Why TrueVedika */}
      <section className="py-24 bg-primary/[0.02] border-y border-border/40 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Why join TrueVedika?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We believe in the power of shared intention and collective growth.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="w-8 h-8 text-primary" />,
                title: "Trusted Spaces",
                description: "Our community is built on mutual respect and verified connections, ensuring a safe environment for all."
              },
              {
                icon: <Heart className="w-8 h-8 text-primary" />,
                title: "Holistic Wellness",
                description: "From morning meditations to weekend hikes, we focus on every dimension of your well-being."
              },
              {
                icon: <Users className="w-8 h-8 text-primary" />,
                title: "Local Impact",
                description: "Connect with neighbors and local experts to build initiatives that matter in your direct environment."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className="bg-primary/5 w-16 h-16 rounded-xl flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-serif font-bold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for? */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <img 
            src={featureImage} 
            alt="Who joins us" 
            className="rounded-3xl shadow-xl w-full h-[400px] object-cover order-2 lg:order-1"
          />
          <div className="space-y-8 order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Who belongs here?</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              TrueVedika is for anyone seeking more than just social media interaction. It's for the seekers, the builders, and the believers.
            </p>
            <ul className="space-y-4">
              {[
                "Wellness practitioners looking to share their practice.",
                "Individuals seeking a supportive local community.",
                "Organizers wanting to build niche wellness initiatives.",
                "Anyone tired of the noise of traditional social platforms."
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="TrueVedika" className="w-8 h-8 object-contain" />
            <span className="text-xl font-serif font-bold text-primary">TrueVedika</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 TrueVedika. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
