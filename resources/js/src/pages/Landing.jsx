import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Mail, ArrowRight, LayoutTemplate, SplitSquareVertical, LineChart, 
  Zap, Shield, CheckCircle2, Star, ChevronDown, ChevronUp, 
  Globe, Building2, Play, MousePointer2, Users, HelpCircle, 
  MessageSquare, BarChart3, Cloud, Layout
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Landing() {
  const user = useStore(state => state.user);
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [heroEmail, setHeroEmail] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect to dashboard if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const faqs = [
    {
      q: "Do I need technical skills to use EmailTracker?",
      a: "Not at all. Our drag-and-drop builder and pre-designed templates make it easy for anyone to create professional emails in minutes."
    },
    {
      q: "Can I use my own SMTP server like AWS SES or SendGrid?",
      a: "Yes! We support custom SMTP configurations. You can connect your own high-reputation servers while using our beautiful interface and tracking."
    },
    {
      q: "How does A/B testing help my campaigns?",
      a: "A/B testing allows you to send two versions of an email to a small segment of your list. We automatically send the 'winning' version to the rest, maximizing your open and click rates."
    },
    {
      q: "Is there a limit on how many subscribers I can have?",
      a: "Our free tier supports up to 500 subscribers. Our premium plans scale with your growth, all the way up to millions of contacts."
    }
  ];

  const integrations = [
    { name: 'AWS SES', icon: Cloud, color: 'text-orange-500' },
    { name: 'SendGrid', icon: Zap, color: 'text-blue-500' },
    { name: 'Mailgun', icon: Mail, color: 'text-red-500' },
    { name: 'Shopify', icon: Building2, color: 'text-emerald-500' },
    { name: 'Zapier', icon: Zap, color: 'text-orange-600' },
    { name: 'Salesforce', icon: Globe, color: 'text-sky-500' },
  ];

  const comparisons = [
    { feature: 'Template Builder', us: 'True Drag-and-Drop', them: 'Basic Text/HTML' },
    { feature: 'A/B Testing', us: 'Automated Winners', them: 'Manual Segmenting' },
    { feature: 'Setup Time', us: 'Under 2 Minutes', them: 'Hours of Config' },
    { feature: 'Analytics', us: 'Real-time Heatmaps', them: 'Delayed Metrics' },
    { feature: 'Pricing', us: 'Pay as you grow', them: 'Fixed Enterprise tiers' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-50">
      
      {/* Navigation */}
      <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled 
          ? 'border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md py-3 shadow-sm' 
          : 'bg-transparent py-5'
      }`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white tracking-tight">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 shadow-sm shadow-emerald-500/20">
                <Mail className="h-4 w-4 text-white" />
              </div>
              EmailTracker
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-white transition-colors">Features</a>
              <a href="#integrations" className="text-sm font-medium text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-white transition-colors">Integrations</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-white transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                Log in
              </Link>
              <Link to="/signup">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 border-none shadow-sm rounded-full px-5 h-9">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-36 pb-20 lg:pt-48 lg:pb-32">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
          </div>
          
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-8 border border-emerald-100 dark:border-emerald-500/20">
              <Zap className="h-3.5 w-3.5" /> High-Performance Email Marketing
            </div>
            
            <h1 className="mx-auto max-w-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-5xl sm:text-6xl lg:text-7xl">
              Send better emails.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400">
                Scale your impact.
              </span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              The unified platform to intuitively design, A/B test, and track your marketing emails. Focus on growth while we handle deliverability.
            </p>
            
            <div className="mt-10 max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-emerald-500/10">
                <Input 
                  type="email" 
                  placeholder="name@company.com" 
                  value={heroEmail}
                  onChange={(e) => setHeroEmail(e.target.value)}
                  className="flex-1 h-12 rounded-xl border-none bg-transparent focus-visible:ring-0 text-base"
                />
                <Link to={`/signup?email=${heroEmail}`} className="w-full sm:w-auto">
                  <Button className="h-12 w-full px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Start Free
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-500 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> No credit card required. Instant access.
              </p>
            </div>
            
            <div className="mt-20 relative px-4 sm:px-0">
               <div className="relative rounded-2xl md:rounded-[2rem] bg-slate-900/5 p-2 ring-1 ring-inset ring-slate-900/10 dark:bg-white/5 dark:ring-white/10">
                  <div className="rounded-xl md:rounded-3xl bg-white dark:bg-slate-950 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2026&auto=format&fit=crop" 
                      alt="Dashboard Preview" 
                      className="w-full aspect-[16/9] object-cover opacity-90 dark:opacity-80 mix-blend-multiply dark:mix-blend-screen"
                    />
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-12 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-8">
              Trusted by 10,000+ creators and companies worldwide
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-50 grayscale dark:invert transition-all hover:grayscale-0 hover:opacity-100">
              {['Acme Corp', 'GlobalTech', 'Innovate', 'Venturely', 'Stellar'].map((brand) => (
                <div key={brand} className="flex items-center gap-2 group cursor-default">
                  <div className="h-8 w-8 rounded-md bg-slate-200 flex items-center justify-center font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">{brand[0]}</div>
                  <span className="font-bold text-lg text-slate-700 dark:text-slate-300">{brand}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Deep Dives */}
        <section id="features" className="py-24 space-y-32">
          {/* Deep Dive 1: Builder */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-24">
              <div className="animate-in fade-in slide-in-from-left-8 duration-700">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
                  <LayoutTemplate className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-6">
                  Design without limits. No code required.
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  Start with our library of high-converting templates or build from scratch. Our intuitive builder lets you craft pixel-perfect emails that look great on any device.
                </p>
                <ul className="space-y-4">
                  {['Drag-and-drop easy interface', 'Mobile-responsive by design', 'Custom component sections'].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-16 lg:mt-0 relative group">
                 <div className="absolute -inset-4 bg-emerald-500/10 rounded-[2.5rem] blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                 <div className="relative aspect-[4/3] rounded-3xl bg-gradient-to-br from-emerald-50 to-slate-100 dark:from-emerald-900/20 dark:to-slate-900 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <MousePointer2 className="h-32 w-32 text-emerald-600/20 dark:text-emerald-400/20" />
                 </div>
              </div>
            </div>
          </div>

          {/* Deep Dive 2: A/B Testing (Reversed) */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-24">
              <div className="lg:order-2">
                <div className="h-12 w-12 rounded-xl bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-6">
                  <SplitSquareVertical className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-6">
                  Eliminate guesswork with A/B testing.
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  Optimize every part of your campaign. Test subject lines, content variants, and delivery times. We automatically scale the winners to maximize your ROI.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                     <span className="block text-2xl font-bold text-teal-600">+24%</span>
                     <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Avg Open Increase</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                     <span className="block text-2xl font-bold text-teal-600">8.4k</span>
                     <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Tests Run Monthly</span>
                  </div>
                </div>
              </div>
              <div className="mt-16 lg:mt-0 lg:order-1 relative group">
                 <div className="absolute -inset-4 bg-teal-500/10 rounded-[2.5rem] blur-2xl group-hover:bg-teal-500/20 transition-all duration-500"></div>
                 <div className="relative aspect-[4/3] rounded-3xl bg-gradient-to-br from-teal-50 to-slate-100 dark:from-emerald-900/20 dark:to-slate-900 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <Zap className="h-32 w-32 text-teal-600/20 dark:text-teal-400/20 animate-pulse" />
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section id="integrations" className="py-24 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Connect with your favorite tools</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">EmailTracker integrates seamlessly with your existing stack. Setup takes seconds.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {integrations.map((item) => (
                <div key={item.name} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-colors shadow-sm">
                  <item.icon className={`h-10 w-10 mb-4 ${item.color}`} />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-24 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
             <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">The Smarter Choice</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">See why high-growth companies are switching to EmailTracker.</p>
             </div>
             <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl bg-white dark:bg-slate-950">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50">
                         <th className="px-6 py-5 font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">Feature</th>
                         <th className="px-6 py-5 font-bold text-emerald-600 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-800">EmailTracker</th>
                         <th className="px-6 py-5 font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">Legacy Tools</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {comparisons.map((row) => (
                         <tr key={row.feature} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{row.feature}</td>
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <CheckCircle2 className="h-4 w-4" /> {row.us}
                               </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.them}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-emerald-600 dark:bg-emerald-900/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_30%_20%,_white_0%,_transparent_60%)]"></div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white">What marketers are saying</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Sarah Jin', role: 'Agency Owner', quote: 'EmailTracker changed how we handle clients. The A/B testing alone increased our ROI by 35% in just two months.' },
                { name: 'Marcus Bloom', role: 'SaaS Founder', quote: 'Finally, a tool that is not bloated. It is fast, clean, and the delivery rates are the best I have ever seen.' },
                { name: 'Dave Rivers', role: 'Content Creator', quote: 'The template gallery is a lifesaver. I spend less time fighting with HTML and more time writing high-quality content.' }
              ].map((t) => (
                <div key={t.name} className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex gap-1 mb-4 text-amber-300">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-white text-lg font-medium italic mb-6 leading-relaxed">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white border border-white/30">{t.name[0]}</div>
                    <div>
                      <p className="font-bold text-white text-sm">{t.name}</p>
                      <p className="text-emerald-200 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
             <div className="text-center mb-16">
               <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Frequently Asked Questions</h2>
             </div>
             <div className="space-y-4">
               {faqs.map((faq, index) => (
                 <div key={index} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
                    <button 
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                       <span className="font-bold text-slate-900 dark:text-white">{faq.q}</span>
                       <div className={`transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}>
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                       </div>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openFaq === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800">
                         <p className="text-slate-600 dark:text-slate-400">{faq.a}</p>
                      </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </section>

        {/* Final CTA Push */}
        <section className="py-24 bg-white dark:bg-slate-950">
           <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative rounded-[3rem] bg-slate-900 px-6 py-20 text-center shadow-2xl sm:px-12 sm:py-32 overflow-hidden dark:bg-emerald-600">
                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-500/20"></div>
                 <div className="relative max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl mb-6">
                      Ready to hit the inbox?
                    </h2>
                    <p className="text-lg text-slate-300 dark:text-emerald-100 mb-10 leading-relaxed font-medium">
                      Join thousands of elite marketers using our unified platform to drive exceptional results. Start your 14-day free trial today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Link to="/signup" className="w-full sm:w-auto">
                         <Button className="h-14 px-10 w-full rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border-none shadow-xl font-bold text-lg dark:text-emerald-600">
                           Get Started Free
                         </Button>
                      </Link>
                      <Button variant="outline" className="h-14 px-10 w-full rounded-2xl border-white/20 text-white hover:bg-white/10">
                         Schedule a Demo
                      </Button>
                    </div>
                 </div>
              </div>
           </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 py-20 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-12 mb-16">
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white mb-6">
                <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                EmailTracker
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">
                The modern email marketing platform built for high-growth teams. Design, test, and scale with ease.
              </p>
            </div>
            <div className="lg:col-span-2">
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 text-sm">Product</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Features</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Integrations</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">API</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 text-sm">Solutions</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">SaaS</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Agencies</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">E-commerce</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Indie Hackers</a></li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 text-sm">Company</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">About Us</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Terms</a></li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 text-sm">Resources</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Documentation</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Community</a></li>
                <li><a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Help Center</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} EmailTracker Inc. Built with ❤️ for high-performance teams.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-400 hover:text-emerald-600 transition-colors"><Globe className="h-5 w-5" /></a>
              <a href="#" className="text-slate-400 hover:text-emerald-600 transition-colors"><MessageSquare className="h-5 w-5" /></a>
              <a href="#" className="text-slate-400 hover:text-emerald-600 transition-colors"><BarChart3 className="h-5 w-5" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
