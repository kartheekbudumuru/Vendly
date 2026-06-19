import React, { useEffect, useRef, useState } from "react";
import { testConnection } from "@/lib/testConnection";
import { Star, Users, Tag, CreditCard, BarChart, QrCode, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Link } from "wouter";

// Helper for format counters
const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          setCount(Math.floor(progress * end));
          if (progress < 1) {
            window.requestAnimationFrame(step);
          }
        };
        window.requestAnimationFrame(step);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  
  return <span ref={ref}>{end >= 1000000 ? `${(count/1000000).toFixed(count===end?0:1)}` : formatNumber(count)}{suffix}</span>;
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroRotation, setHeroRotation] = useState({ x: 0, y: 0 });
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const handleHeroMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setHeroRotation({ x: -y / 20, y: x / 20 });
  };

  const handleHeroMouseLeave = () => {
    setHeroRotation({ x: 0, y: 0 });
  };
  useEffect(() => {
    testConnection();
  }, []);
  // Particles
  useEffect(() => {
    const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: any[] = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.1
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(247, 201, 72, ${p.alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-gold font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <Star className="text-gold fill-gold h-5 w-5" />
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
          <a href="#features" className="hover:text-white transition-colors" data-testid="nav-features">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors" data-testid="nav-how-it-works">How It Works</a>
          <a href="#pricing" className="hover:text-white transition-colors" data-testid="nav-pricing">Pricing</a>
          <Link href="/login" className="hover:text-white transition-colors" data-testid="nav-login">Login</Link>
        </div>
        <Link href="/register">
          <button className="bg-primary text-primary-foreground px-5 py-2 rounded-full font-semibold hover:bg-gold/90 transition-colors cursor-pointer" data-testid="nav-cta">
            Get Vendly Free
          </button>
        </Link>
      </nav>

      {/* HERO SECTION */}
      <section 
        className="relative min-h-screen flex items-center justify-center pt-20 perspective-1000"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        <canvas id="particle-canvas" className="absolute inset-0 z-0 pointer-events-none opacity-60"></canvas>
        
        <div 
          ref={heroRef}
          className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-4 preserve-3d"
          style={{ transform: `rotateX(${heroRotation.x}deg) rotateY(${heroRotation.y}deg)`, transition: 'transform 0.1s ease-out' }}
        >
          {/* 3D Coin */}
          <div className="mb-12 relative w-48 h-48 preserve-3d animate-spin-y">
            <div className="absolute inset-0 rounded-full border-4 border-gold bg-card flex items-center justify-center gold-glow backface-hidden" style={{ transform: 'translateZ(10px)' }}>
              <span className="text-6xl font-bold text-gold">V</span>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-gold bg-card flex items-center justify-center gold-glow backface-hidden rotate-y-180" style={{ transform: 'translateZ(-10px) rotateY(180deg)' }}>
              <Star className="w-20 h-20 text-gold fill-gold" />
            </div>
            {/* Edge */}
            <div className="absolute inset-0 rounded-full bg-gold/50" style={{ transform: 'translateZ(0px) scale(0.98)', filter: 'blur(5px)' }}></div>
          </div>

          <h1 className="text-7xl font-extrabold text-white mb-6" style={{ textShadow: '0 0 20px rgba(79,142,247,0.4)' }}>
            Vendly
          </h1>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue to-gold bg-clip-text text-transparent">
            Grow Smarter. Reward Loyal.
          </h2>
          <p className="text-xl text-muted max-w-2xl mb-10">
            The complete loyalty & CRM platform for local businesses across India
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg hover:bg-gold/90 transition-all hover:scale-105 gold-glow cursor-pointer" data-testid="hero-primary-cta">
                Start with Vendly Free
              </button>
            </Link>
            <button className="border-2 border-blue text-blue px-8 py-4 rounded-full font-bold text-lg hover:bg-blue/10 transition-all hover:scale-105 blue-glow cursor-pointer" data-testid="hero-secondary-cta">
              Watch Demo
            </button>
          </div>
          
          <div className="absolute top-1/2 -left-20 md:-left-40 glass-panel px-4 py-2 rounded-xl animate-float">
            <div className="text-gold font-bold text-xl">10K+ Vendors</div>
          </div>
          <div className="absolute top-1/3 -right-20 md:-right-40 glass-panel px-4 py-2 rounded-xl animate-float" style={{ animationDelay: '1s' }}>
            <div className="text-blue font-bold text-xl">2M+ Customers</div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="py-12 border-y border-white/10 glass-panel relative z-20">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-gold mb-2">
              <AnimatedCounter end={10000} suffix="+" />
            </div>
            <div className="text-white font-medium">Vendors</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-gold mb-2">
              <AnimatedCounter end={2000000} suffix="M+" />
            </div>
            <div className="text-white font-medium">Customers</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-gold mb-2">₹50Cr+</div>
            <div className="text-white font-medium">Rewards Given</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-gold mb-2">
              <AnimatedCounter end={98} suffix="%" />
            </div>
            <div className="text-white font-medium">Retention Rate</div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">Everything You Need to Grow</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 perspective-1000">
            {[
              { icon: <Users className="w-10 h-10 text-gold mb-4" />, title: "Vendly CRM", desc: "Customer profiles, purchase history & smart segments" },
              { icon: <Star className="w-10 h-10 text-gold mb-4" />, title: "Loyalty Points", desc: "Earn & redeem points on every visit. Auto-applied rewards." },
              { icon: <Tag className="w-10 h-10 text-gold mb-4" />, title: "Smart Coupons", desc: "Festival & personalized offers that drive repeat visits" },
              { icon: <CreditCard className="w-10 h-10 text-gold mb-4" />, title: "Udhaar Tracker", desc: "Credit management & payment reminders for trusted customers" },
              { icon: <BarChart className="w-10 h-10 text-gold mb-4" />, title: "Vendly Analytics", desc: "Real-time sales insights, top customers & growth trends" },
              { icon: <QrCode className="w-10 h-10 text-gold mb-4" />, title: "QR Checkout", desc: "Scan, pay & earn loyalty points in seconds" },
            ].map((f, i) => (
              <div key={i} className="h-64 w-full flip-card group cursor-pointer" data-testid={`feature-card-${i}`}>
                <div className="flip-card-inner relative w-full h-full">
                  <div className="absolute inset-0 glass-panel rounded-2xl p-8 flex flex-col items-center justify-center text-center backface-hidden">
                    {f.icon}
                    <h3 className="text-2xl font-bold text-gold">{f.title}</h3>
                  </div>
                  <div className="absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 bg-gradient-to-br from-blue to-emerald">
                    <p className="text-white text-lg font-medium">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-card relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-20">Up & Running in Minutes</h2>
          
          <div className="relative flex flex-col md:flex-row items-start justify-between gap-8 perspective-1000">
            <div className="hidden md:block absolute top-12 left-0 right-0 h-1 bg-white/10" style={{ transform: 'translateZ(-10px)' }}></div>
            
            {[
              { num: 1, title: "Sign Up on Vendly", desc: "Free signup, no credit card needed" },
              { num: 2, title: "Add Your Customers", desc: "Import contacts or let customers scan your QR" },
              { num: 3, title: "Set Rewards & Offers", desc: "Design loyalty rules and festival campaigns in minutes" },
              { num: 4, title: "Watch Your Business Grow", desc: "Track loyalty, revenue, and repeat visits in real-time" }
            ].map((step, i) => (
              <div key={i} className="flex-1 relative preserve-3d w-full group" data-testid={`step-${i}`}>
                <div className="glass-panel rounded-2xl p-6 relative z-10 transition-transform duration-300 group-hover:-translate-y-4 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]" style={{ transform: 'translateZ(20px)' }}>
                  <div className="w-12 h-12 rounded-full bg-gold text-card flex items-center justify-center font-bold text-xl mb-4 mx-auto md:mx-0 shadow-lg">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 text-center md:text-left">{step.title}</h3>
                  <p className="text-muted text-center md:text-left">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VENDLY WALLET PREVIEW */}
      <section className="py-24 relative z-10 overflow-hidden">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Your Customers Carry Vendly in Their Pocket</h2>
            <ul className="space-y-6 mb-10">
              {[
                "Digital Loyalty Cards — No more paper cards to lose",
                "Instant Reward Notifications on WhatsApp",
                "Personalized Offers based on past purchases",
                "Easy Balance Checking & History"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-lg text-muted">
                  <div className="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-emerald" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <button className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg hover:bg-gold/90 transition-all gold-glow" data-testid="wallet-cta">
              Explore Customer Experience
            </button>
          </div>
          
          <div className="flex-1 perspective-1000 flex justify-center mt-12 lg:mt-0">
            <div className="w-72 h-[600px] bg-card rounded-[3rem] border-8 border-white/20 relative animate-float-3d shadow-2xl overflow-hidden glass-panel p-4 flex flex-col">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-20"></div>
              
              <div className="text-center mb-6 mt-8">
                <h3 className="text-gold font-bold text-xl">Vendly Wallet</h3>
              </div>
              
              <div className="bg-gradient-to-br from-blue to-emerald rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="text-sm font-medium opacity-80 mb-1">Ravi's Supermarket</div>
                <div className="text-3xl font-bold mb-4">2,450 Points</div>
                <div className="flex justify-between items-center text-sm">
                  <span>Loyalty Member</span>
                  <QrCode className="w-6 h-6" />
                </div>
              </div>
              
              <div className="bg-emerald/10 border border-emerald/20 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <div className="text-emerald font-bold">10% OFF Coupon</div>
                  <div className="text-xs text-muted">Expires in 2 days</div>
                </div>
                <Tag className="text-emerald w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <div className="text-sm font-bold text-muted mb-4">Recent Transactions</div>
                {[
                  { desc: "Grocery Purchase", pts: "+150", color: "text-emerald" },
                  { desc: "Reward Redeemed", pts: "-500", color: "text-red-400" },
                  { desc: "Festival Bonus", pts: "+200", color: "text-emerald" },
                ].map((t, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                    <div className="text-sm text-white">{t.desc}</div>
                    <div className={`text-sm font-bold ${t.color}`}>{t.pts}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (3D Carousel) */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">Vendors Love Vendly</h2>
          
          <div className="relative max-w-4xl mx-auto perspective-1000 h-64 flex items-center justify-center">
            {[
              { name: "Ravi Kumar", desc: "Kirana Owner, Hyderabad", text: "Vendly ne mera business badal diya! Customers ab repeat aate hain." },
              { name: "Priya Sharma", desc: "Boutique Owner, Chennai", text: "Pehle customers bhool jaate the. Ab Vendly unhe yaad dilata hai!" },
              { name: "Ahmed Khan", desc: "Street Food Vendor, Mumbai", text: "Simple, fast aur powerful. Best decision for my dhaba!" },
            ].map((t, i) => {
              const isActive = i === activeTestimonial;
              const isPrev = i === (activeTestimonial - 1 + 3) % 3;
              const isNext = i === (activeTestimonial + 1) % 3;
              
              let transform = 'translateZ(-100px) rotateY(0deg) scale(0.8)';
              let opacity = 0.5;
              let zIndex = 0;
              
              if (isActive) {
                transform = 'translateZ(0px) rotateY(0deg) scale(1)';
                opacity = 1;
                zIndex = 10;
              } else if (isPrev) {
                transform = 'translateX(-30%) translateZ(-100px) rotateY(30deg) scale(0.85)';
                opacity = 0.7;
                zIndex = 5;
              } else if (isNext) {
                transform = 'translateX(30%) translateZ(-100px) rotateY(-30deg) scale(0.85)';
                opacity = 0.7;
                zIndex = 5;
              } else {
                transform = 'translateZ(-200px) scale(0.5)';
                opacity = 0;
              }
              
              return (
                <div 
                  key={i} 
                  className="absolute w-full max-w-lg glass-panel rounded-2xl p-8 transition-all duration-500 ease-in-out text-center"
                  style={{ transform, opacity, zIndex }}
                >
                  <div className="text-4xl text-gold font-serif mb-4">"</div>
                  <p className="text-xl text-white mb-6 font-medium">"{t.text}"</p>
                  <div>
                    <div className="font-bold text-gold">{t.name}</div>
                    <div className="text-sm text-muted">{t.desc}</div>
                  </div>
                </div>
              );
            })}
            
            <button 
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-panel flex items-center justify-center text-white hover:text-gold transition-colors hover:scale-110"
              onClick={() => setActiveTestimonial((prev) => (prev - 1 + 3) % 3)}
              data-testid="testimonial-prev"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full glass-panel flex items-center justify-center text-white hover:text-gold transition-colors hover:scale-110"
              onClick={() => setActiveTestimonial((prev) => (prev + 1) % 3)}
              data-testid="testimonial-next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">Vendly Plans — Start Free, Scale Smart</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto perspective-1000">
            {/* Starter */}
            <div className="glass-panel rounded-3xl p-8 flex flex-col" data-testid="pricing-starter">
              <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
              <div className="text-4xl font-extrabold text-gold mb-4">Free</div>
              <p className="text-muted mb-8">Up to 100 customers</p>
              <ul className="space-y-4 mb-8 flex-1">
                {["Basic CRM", "Standard Loyalty Points", "QR Checkout", "Email Support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <Check className="w-5 h-5 text-emerald" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <button className="w-full border-2 border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors cursor-pointer" data-testid="btn-starter">
                  Start Free
                </button>
              </Link>
            </div>
            
            {/* Growth */}
            <div className="glass-panel rounded-3xl p-8 flex flex-col relative transform -translate-y-4 gold-glow border-gold/30" data-testid="pricing-growth">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-card px-4 py-1 rounded-full text-sm font-bold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Growth</h3>
              <div className="text-4xl font-extrabold text-gold mb-4">₹499<span className="text-lg text-muted font-normal">/mo</span></div>
              <p className="text-muted mb-8">Up to 1000 customers + Analytics</p>
              <ul className="space-y-4 mb-8 flex-1">
                {["Everything in Starter", "Smart Coupons", "Udhaar Tracker", "Advanced Analytics", "WhatsApp Notifications"].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <Check className="w-5 h-5 text-emerald" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <button className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-gold/90 transition-colors cursor-pointer" data-testid="btn-growth">
                  Start Growing
                </button>
              </Link>
            </div>
            
            {/* Pro */}
            <div className="glass-panel rounded-3xl p-8 flex flex-col" data-testid="pricing-pro">
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <div className="text-4xl font-extrabold text-gold mb-4">₹999<span className="text-lg text-muted font-normal">/mo</span></div>
              <p className="text-muted mb-8">Unlimited + AI + Multilingual</p>
              <ul className="space-y-4 mb-8 flex-1">
                {["Everything in Growth", "Unlimited Customers", "AI Recommendations", "Multilingual Support", "Priority 24/7 Support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <Check className="w-5 h-5 text-emerald" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <button className="w-full border-2 border-blue text-blue px-6 py-3 rounded-xl font-bold hover:bg-blue/10 transition-colors cursor-pointer" data-testid="btn-pro">
                  Go Pro
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-card border-t border-white/10 pt-16 pb-8 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="text-gold font-bold text-3xl flex items-center mb-4">
                <span className="text-white">Vend</span><span className="text-gold">ly</span>
                <Star className="text-gold fill-gold h-6 w-6 ml-2" />
              </div>
              <p className="text-muted max-w-sm">Empowering every vendor, one loyalty point at a time.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-muted">
                <li><a href="#" className="hover:text-gold transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Reviews</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-muted">
                <li><a href="#" className="hover:text-gold transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-muted text-sm">
            <p>Made with love for Bharat 🇮🇳</p>
            <p>&copy; {new Date().getFullYear()} Vendly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
