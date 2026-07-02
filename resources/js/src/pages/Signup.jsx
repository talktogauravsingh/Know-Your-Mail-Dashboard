import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import {
  Check, Eye, EyeOff, User, Mail, Phone,
  Building2, Lock, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw,
  Sun, Moon
} from 'lucide-react';
import api from '../lib/api';

const steps = [
  { number: 1, label: 'Your Details', desc: 'Name, email & phone' },
  { number: 2, label: 'Organization', desc: 'Type and name' },
  { number: 3, label: 'Security', desc: 'Choose your password' },
  { number: 4, label: 'Verification', desc: 'Verify email OTP' }
];

const orgTypes = [
  { slug: 'individual', name: 'Individual', desc: 'Personal projects or freelance work', icon: '👤' },
  { slug: 'marketing', name: 'Marketing Agency', desc: 'Managing campaigns for clients', icon: '📣' },
  { slug: 'sales', name: 'Sales', desc: 'Outreach & prospecting campaigns', icon: '💼' },
  { slug: 'technology', name: 'Technology / SaaS', desc: 'Software product or sending APIs', icon: '⚡' },
  { slug: 'enterprise', name: 'Enterprise', desc: 'Large scale high volume sending', icon: '🏢' },
  { slug: 'other', name: 'Other', desc: 'Any other business category', icon: '🌐' }
];

export default function Signup() {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2 state
  const [orgType, setOrgType] = useState('individual');
  const [orgName, setOrgName] = useState('');
  const [isSkipped, setIsSkipped] = useState(false);

  // Step 3 state
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 4 state
  const [otp, setOtp] = useState('');
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Overall loading & store hooks
  const [isLoading, setIsLoading] = useState(false);

  // Weather detection state for cute emoji Sun
  const [weatherState, setWeatherState] = useState('sunny'); // 'sunny', 'rainy', 'winter'

  useEffect(() => {
    const fetchWeather = async () => {
      let lat = null;
      let lon = null;

      // Try FreeIPAPI first (very high free rate limits, no keys)
      try {
        const geoRes = await fetch('https://freeipapi.com/api/json');
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          lat = geoData.latitude;
          lon = geoData.longitude;
        }
      } catch (e) {
        console.warn('[Weather Detection] FreeIPAPI failed, trying ipapi.co...', e);
      }

      // Try ipapi.co as secondary backup
      if (!lat || !lon) {
        try {
          const geoRes = await fetch('https://ipapi.co/json/');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (!geoData.error) {
              lat = geoData.latitude;
              lon = geoData.longitude;
            }
          }
        } catch (e) {
          console.warn('[Weather Detection] ipapi.co backup failed...', e);
        }
      }

      // If coordinates are resolved, query Open-Meteo
      if (lat && lon) {
        try {
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
          );
          if (weatherRes.ok) {
            const weatherData = await weatherRes.json();
            const temp = weatherData.current_weather.temperature;
            const code = weatherData.current_weather.weathercode;

            // WMO codes: Rainy (51-67, 80-82, 95-99)
            const isRainy = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
            // Winter/Snow (71-77, 85-86) or cold temp (< 10C)
            const isWinter = [71, 73, 75, 77, 85, 86].includes(code) || temp < 10;

            let detectedState = 'sunny';
            if (isWinter) {
              detectedState = 'winter';
            } else if (isRainy) {
              detectedState = 'rainy';
            }

            console.log(`[Weather Detection] Location coordinates: ${lat}, ${lon}. Temp: ${temp}°C, WMO Code: ${code} => State: ${detectedState}`);
            setWeatherState(detectedState);
            return;
          }
        } catch (e) {
          console.warn('[Weather Detection] Open-Meteo weather fetch failed', e);
        }
      }

      // Safe fallback based on current calendar month
      const month = new Date().getMonth();
      let fallbackState = 'rainy';
      if ([11, 0, 1].includes(month)) {
        fallbackState = 'winter';
      } else if ([5, 6, 7, 8].includes(month)) {
        fallbackState = 'sunny';
      }
      console.log(`[Weather Detection] Geolocation failed. Using month-based fallback: ${fallbackState}`);
      setWeatherState(fallbackState);
    };

    fetchWeather();
  }, []);

  const register = useStore((state) => state.register);
  const addToast = useStore((state) => state.addToast);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const navigate = useNavigate();

  // Sync theme class to document root for local testing/auth flow
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Animated Theme Switch Transition State
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState('idle'); // 'idle', 'dropping', 'active', 'leaving'
  const [flapOpen, setFlapOpen] = useState(true);
  const [sunOffset, setSunOffset] = useState(-30);
  const [sunScale, setSunScale] = useState(1);

  const handleThemeToggleClick = () => {
    if (isThemeTransitioning) return;

    const goingToDark = theme === 'light';
    setIsThemeTransitioning(true);

    if (goingToDark) {
      // Light to Dark: start with open flap and sun floating outside
      setFlapOpen(true);
      setSunOffset(-30);
      setSunScale(1);
      setTransitionStage('dropping');

      // Drop phase finishes in 600ms
      setTimeout(() => {
        setTransitionStage('active');
        // Push sun inside & scale it down (takes 500ms)
        setSunOffset(90);
        setSunScale(0.25);

        // Flap closes after sun is fully inside
        setTimeout(() => {
          setFlapOpen(false);

          // Swap theme after flap is closed
          setTimeout(() => {
            toggleTheme();

            // Briefly pause then trigger exit downward
            setTimeout(() => {
              setTransitionStage('leaving');

              // Finish cleanup
              setTimeout(() => {
                setIsThemeTransitioning(false);
                setTransitionStage('idle');
              }, 600);
            }, 350);
          }, 500);
        }, 550);
      }, 600);
    } else {
      // Dark to Light: start with closed flap and sun hidden inside
      setFlapOpen(false);
      setSunOffset(90);
      setSunScale(0.25);
      setTransitionStage('dropping');

      // Drop phase finishes in 600ms
      setTimeout(() => {
        setTransitionStage('active');
        // Open flap (takes 500ms)
        setFlapOpen(true);

        // Sun slides up out of envelope & scales back up after flap is open
        setTimeout(() => {
          setSunOffset(-30);
          setSunScale(1);

          // Swap theme after sun is fully out
          setTimeout(() => {
            toggleTheme();

            // Briefly pause then trigger exit downward
            setTimeout(() => {
              setTransitionStage('leaving');

              // Finish cleanup
              setTimeout(() => {
                setIsThemeTransitioning(false);
                setTransitionStage('idle');
              }, 600);
            }, 350);
          }, 500);
        }, 550);
      }, 600);
    }
  };

  // Handle Resend OTP timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Extract first name for organization naming logic
  const getFirstName = () => {
    const trimmed = name.trim();
    if (!trimmed) return 'User';
    return trimmed.split(' ')[0];
  };

  // Automatically trigger OTP sending when stepping into step 4
  useEffect(() => {
    if (currentStep === 4) {
      sendVerificationOtp();
    }
  }, [currentStep]);

  const sendVerificationOtp = async () => {
    setIsOtpSending(true);
    try {
      await api.post('/auth/send-otp', {
        name,
        email,
        phone_number: phone
      });
      addToast('Verification OTP code sent to your email!', 'success');
      setResendTimer(60); // 60 seconds rate limiting resend
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to send OTP. Please go back and verify details.';
      addToast(errorMsg, 'error');
      setCurrentStep(3); // Kick back to step 3 so they can retry or fix email
    } finally {
      setIsOtpSending(false);
    }
  };

  // Move forward through steps with validation
  const nextStep = () => {
    if (currentStep === 1) {
      if (!name || !email || !phone) {
        addToast('Please fill all details to proceed.');
        return;
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        addToast('Please enter a valid email address.');
        return;
      }
    }
    if (currentStep === 3) {
      if (!password || !passwordConfirm) {
        addToast('Please enter and confirm your password.');
        return;
      }
      if (password !== passwordConfirm) {
        addToast('Passwords must match.');
        return;
      }
      if (password.length < 8) {
        addToast('Password must be at least 8 characters long.');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleStepClick = (stepNumber) => {
    if (stepNumber === currentStep) return;

    // Backward navigation is always allowed
    if (stepNumber < currentStep) {
      setCurrentStep(stepNumber);
      return;
    }

    // Forward navigation requires validation of the current step first
    if (stepNumber > currentStep) {
      if (currentStep === 1) {
        if (!name || !email || !phone) {
          addToast('Please fill all details to proceed.');
          return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
          addToast('Please enter a valid email address.');
          return;
        }
      }
      if (currentStep === 3) {
        if (!password || !passwordConfirm) {
          addToast('Please enter and confirm your password.');
          return;
        }
        if (password !== passwordConfirm) {
          addToast('Passwords must match.');
          return;
        }
        if (password.length < 8) {
          addToast('Password must be at least 8 characters long.');
          return;
        }
      }

      // Allow advancing sequentially
      if (stepNumber === currentStep + 1) {
        setCurrentStep(stepNumber);
      } else {
        addToast('Please complete the steps sequentially.');
      }
    }
  };

  const handleSkipOrgStep = () => {
    setIsSkipped(true);
    setOrgType('individual');
    // Generate skip organization name matching logic
    const uniqueKey = Math.random().toString(36).substring(2, 7);
    setOrgName(`${getFirstName()}-${uniqueKey}'s Organization`);
    setCurrentStep(3);
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      addToast('Please enter a 6-digit OTP code.');
      return;
    }
    setIsLoading(true);
    try {
      // Resolve organization type name if skipping is disabled or we filled it
      let finalOrgName = orgName;
      if (!finalOrgName && !isSkipped) {
        finalOrgName = `${getFirstName()}'s Organization`;
      }

      await register({
        name,
        email,
        phone_number: phone,
        organization_type: orgType,
        organization_name: finalOrgName,
        is_skipped: isSkipped,
        password,
        password_confirmation: passwordConfirm,
        otp
      });
      addToast('Account created successfully!', 'success');
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.message || (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : error.message);
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Password matching state checking helper
  const passwordsMatch = password && passwordConfirm && password === passwordConfirm;
  const passwordsDoNotMatch = password && passwordConfirm && password !== passwordConfirm;

  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">

      {/* Page Content Wrapper (scaled and blurred on theme switch) */}
      <div className={`flex min-h-screen w-full transition-all duration-700 ease-in-out ${
        isThemeTransitioning 
          ? 'scale-[0.98] blur-[6px] rotate-[1.5deg] opacity-90' 
          : 'scale-100 blur-none rotate-0 opacity-100'
      }`}>

      {/* LEFT PANEL: VERTICAL STEPPER STATUS (Dark Side Panel) */}
      <div className="hidden md:flex md:w-[35%] lg:w-[30%] bg-indigo-950 text-slate-100 flex-col justify-between p-10 relative overflow-hidden shrink-0 border-r border-slate-900/50">
        {/* Soft SaaS Glowing Gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/15 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/15 blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          {/* Logo Header */}
          <div className="flex items-center gap-3 mb-16">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><path d="M19 16v6" /><path d="M16 19h6" /></svg>
            </div>
            <span className="text-xl font-black tracking-tight text-white">Know Your Mail</span>
          </div>

          <div className="mb-10">
            <h3 className="text-lg font-bold text-indigo-200">Setup Guide</h3>
            <p className="text-xs text-indigo-300/60 mt-1">Complete these 4 steps to initialize your account.</p>
          </div>

          <div className="relative space-y-8 pl-4">
            {/* Connecting Vertical line */}
            <div className="absolute left-[29px] top-4 bottom-4 w-0.5 bg-indigo-900/60 -z-10" />

            {steps.map((s) => {
              const isCompleted = s.number < currentStep;
              const isActive = s.number === currentStep;
              const isClickable = s.number <= currentStep + 1;

              return (
                <div
                  key={s.number}
                  onClick={() => handleStepClick(s.number)}
                  className={`flex items-center gap-4 transition-all duration-300 relative rounded-xl p-3 border border-transparent ${
                    isActive ? 'active-step-shimmer-dark border-white/10 shadow-sm' : ''
                  } ${isCompleted ? 'opacity-55 blur-[0.4px]' : ''} ${
                    isClickable ? 'cursor-pointer hover:bg-white/5' : 'cursor-not-allowed opacity-40'
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-center">
                    {isCompleted ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md transition-all duration-300">
                        <Check className="h-4 w-4 stroke-[3px]" />
                      </div>
                    ) : isActive ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md ring-4 ring-indigo-500/20 font-bold transition-all duration-300">
                        {s.number}
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 font-semibold transition-all duration-300">
                        {s.number}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-350'
                      }`}>
                      {s.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 border-t border-indigo-900/50 pt-6">
          <p className="text-xs text-indigo-300/80 leading-relaxed mb-4">
            Designed for modern developers and marketing agencies. Track, analyze, and optimize your email delivery campaigns in real-time.
          </p>
          <p className="text-[10px] text-slate-400">
            Need help? Contact <a href="mailto:support@emailtracker.com" className="text-indigo-400 hover:underline">Support</a>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: MAIN FORM CONTENT CONTAINER (Takes remaining width and height) */}
      <div className="flex-1 flex flex-col justify-between min-h-screen overflow-y-auto p-6 sm:p-12 md:p-16 relative">

        {/* Floating Light/Dark Theme Switcher */}
        <button
          type="button"
          onClick={handleThemeToggleClick}
          className="absolute right-6 top-6 rounded-full p-2.5 bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 text-slate-500 hover:text-slate-900 dark:hover:text-slate-50 transition-all shadow-sm hover:shadow z-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Mobile Header (only visible on small screens since sidebar is hidden) */}
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><path d="M19 16v6" /><path d="M16 19h6" /></svg>
            </div>
            <span className="text-md font-bold tracking-tight text-slate-900 dark:text-slate-100">Know Your Mail</span>
          </div>
          <span className="text-xs font-semibold text-slate-400">Step {currentStep} of 4</span>
        </div>

        {/* Center Card wrapping active step contents */}
        <div className="w-full max-w-xl mx-auto my-auto bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl p-6 sm:p-10 transition-all duration-300">

          {/* Step Title Header */}
          <div className="mb-8">
            <div className="hidden md:block text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mb-1">
              Step {currentStep} of 4
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {currentStep === 1 && "Let's get to know you"}
              {currentStep === 2 && "Tell us about your organization"}
              {currentStep === 3 && "Secure your account"}
              {currentStep === 4 && "Verify your email"}
            </h2>
            <p className="text-sm text-slate-505 dark:text-slate-400 mt-2 leading-relaxed">
              {currentStep === 1 && "Please enter your name, business email, and phone number to start."}
              {currentStep === 2 && "Choose your organization type. You can easily skip this step if it is for personal use."}
              {currentStep === 3 && "Choose a strong password to guard your analytics dashboard."}
              {currentStep === 4 && `Enter the 6-digit confirmation code we sent to ${email}.`}
            </p>
          </div>

          {/* Form elements container */}
          <div className="min-h-[260px] flex flex-col justify-center">

            {/* STEP 1: PERSONAL DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-350">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setIsSkipped(false); // Reset skipped indicator if they edit step 1
                      }}
                      className="pl-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-350">Business Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700 dark:text-slate-350">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-11"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ORGANIZATION TYPE & NAME */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-350">Organization Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {orgTypes.map((type) => (
                      <button
                        key={type.slug}
                        type="button"
                        onClick={() => {
                          setOrgType(type.slug);
                          setIsSkipped(false);
                        }}
                        className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-200 hover:shadow-md ${orgType === type.slug && !isSkipped
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10 dark:border-indigo-500 dark:bg-indigo-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50'
                          }`}
                      >
                        <span className="text-xl mb-1">{type.icon}</span>
                        <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{type.name}</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5 line-clamp-2">{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="orgName" className="text-slate-700 dark:text-slate-350">Organization Name</Label>
                    <span className="text-[10px] text-slate-400 italic">Leave empty to auto-generate as "{getFirstName()}'s Organization"</span>
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="orgName"
                      type="text"
                      placeholder={`${getFirstName()}'s Organization`}
                      value={isSkipped ? '' : orgName}
                      onChange={(e) => {
                        setOrgName(e.target.value);
                        setIsSkipped(false);
                      }}
                      className="pl-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PASSWORD SETTING */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-350">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold focus:outline-none"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> View Password
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-11 ${passwordsMatch ? 'border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20' : ''
                        } ${passwordsDoNotMatch ? 'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20' : ''
                        }`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm" className="text-slate-700 dark:text-slate-350">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="passwordConfirm"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className={`pl-11 ${passwordsMatch ? 'border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20' : ''
                        } ${passwordsDoNotMatch ? 'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20' : ''
                        }`}
                      required
                    />
                  </div>
                </div>

                {/* Password Matching Feedback Indicators */}
                <div className="pt-2 min-h-[20px]">
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-xs text-amber-500 font-semibold flex items-center gap-1 animate-pulse">
                      ⚠ Password must be at least 8 characters.
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-450 font-extrabold flex items-center gap-1.5 animate-pulse">
                      <Check className="h-3.5 w-3.5 stroke-[3px]" /> Passwords match
                    </p>
                  )}
                  {passwordsDoNotMatch && (
                    <p className="text-xs text-rose-500 font-extrabold flex items-center gap-1.5">
                      ✕ Passwords do not match
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: EMAIL OTP VERIFICATION */}
            {currentStep === 4 && (
              <form onSubmit={handleSignupSubmit} className="space-y-6">
                {isOtpSending ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    {/* Spin loader matching color theme used in campaign creation flow */}
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600 mb-3" />
                    <p className="text-xs text-slate-500 dark:text-slate-450">Sending verification code to {email}...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-slate-700 dark:text-slate-350">Verification Code (OTP)</Label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="otp"
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="pl-11 tracking-widest text-center text-lg font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={resendTimer > 0}
                        onClick={sendVerificationOtp}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 focus:outline-none"
                      >
                        <RefreshCw className={`h-3 w-3 ${resendTimer > 0 ? '' : 'animate-spin'}`} />
                        {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Verification Code'}
                      </button>

                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Didn't get the code? Check spam folder.
                      </span>
                    </div>
                  </>
                )}
              </form>
            )}

          </div>

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-6">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="gap-2 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Step 2 specific Skip option */}
              {currentStep === 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkipOrgStep}
                  className="text-slate-500 hover:text-slate-850 hover:bg-slate-100/50"
                >
                  Skip Organization
                </Button>
              )}

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md hover:shadow-lg focus:ring-2 focus:ring-indigo-500/20"
                >
                  Next Step <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  onClick={handleSignupSubmit}
                  isLoading={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md hover:shadow-lg focus:ring-2 focus:ring-indigo-500/20"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    "Verify & Complete"
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 mt-6 pt-2">
            Already have an account? <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">Sign in</Link>
          </div>

        </div>

        {/* Footer info (matches Vercel/Linear split style footer) */}
        <div className="text-center text-xs text-slate-400/80 pt-8 flex flex-wrap items-center justify-center gap-2">
          <span>&copy; {new Date().getFullYear()} Know Your Mail. All rights reserved.</span>
          <span>&bull;</span>
          <a href="#" className="hover:underline">Terms of Service</a>
          <span>&bull;</span>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <span>&bull;</span>
          <button 
            type="button" 
            onClick={() => {
              const states = ['sunny', 'rainy', 'winter'];
              const nextIdx = (states.indexOf(weatherState) + 1) % states.length;
              setWeatherState(states[nextIdx]);
            }} 
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold focus:outline-none"
          >
            Weather: {weatherState === 'sunny' ? 'Sunny ☀️' : weatherState === 'rainy' ? 'Rainy 🌧️' : 'Winter ❄️'}
          </button>
        </div>

      </div>
      
      {/* End of Page Content Wrapper */}
      </div>

      {/* Theme Transition Overlay (keeps sharp focus) */}
      {isThemeTransitioning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/20 backdrop-blur-sm transition-colors duration-500">
          <div className="perspective-1000 absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`absolute left-1/2 w-64 h-40 origin-center ${
                transitionStage === 'dropping'
                  ? 'animate-envelope-drop'
                  : transitionStage === 'leaving'
                    ? 'animate-envelope-leave'
                    : 'animate-envelope-active'
              }`}
              style={{ top: '50%' }}
            >
              {/* Envelope Back Plate */}
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-b-xl border border-slate-200 dark:border-slate-700/60 z-0 shadow-lg" />

              {/* Sun Element */}
              <div
                style={{
                  transform: `translate(-50%, ${sunOffset}px) scale(${sunScale})`,
                  transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                className="absolute left-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 shadow-[0_0_40px_rgba(245,158,11,0.95)] z-10 flex items-center justify-center"
              >
                {/* Pulsing Solar Corona Glow Ring */}
                <div className="absolute inset-[-6px] rounded-full bg-gradient-to-r from-amber-400 to-orange-500 blur-[8px] opacity-75 animate-pulse" />

                {/* Sun Core White Hot Center */}
                <div className="absolute w-8 h-8 rounded-full bg-white/95 shadow-[0_0_15px_rgba(255,255,255,0.9)] z-10" />

                {/* Glasses / Specs */}
                <div className="absolute top-[20px] flex items-center gap-[2px] z-20">
                  {/* Left lens */}
                  <div className="relative w-[18px] h-3.5 bg-slate-950 dark:bg-black rounded-b-md rounded-t-sm shadow border border-slate-900 flex items-center justify-center overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40" />
                    <div className="absolute top-0.5 left-0.5 w-2 h-[1px] bg-white/30 rotate-[-30deg]" />
                  </div>
                  {/* Bridge */}
                  <div className="w-[3px] h-[1.5px] bg-slate-950 dark:bg-black shadow-sm" />
                  {/* Right lens */}
                  <div className="relative w-[18px] h-3.5 bg-slate-950 dark:bg-black rounded-b-md rounded-t-sm shadow border border-slate-900 flex items-center justify-center overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40" />
                    <div className="absolute top-0.5 left-0.5 w-2 h-[1px] bg-white/30 rotate-[-30deg]" />
                  </div>
                </div>

                {/* Smile */}
                <div className="absolute bottom-3 w-3.5 h-2 border-b-[2px] border-amber-950 rounded-b-full z-20" />

                {/* Climate Weather Effects (Clouds, Birds, Snowflakes) */}
                {/* 1. Rainy: Clouds & Lightning over Head */}
                {weatherState === 'rainy' && (
                  <div className="absolute inset-0 pointer-events-none overflow-visible">
                    {/* Cloud 1 */}
                    <div className="absolute top-[-17px] left-[-10px] z-25 text-slate-400 dark:text-slate-500 drop-shadow">
                      <svg className="w-9 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M19.36,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.36,10.04z" />
                      </svg>
                    </div>
                    {/* Cloud 2 */}
                    <div className="absolute top-[-22px] right-[-12px] z-25 text-slate-300 dark:text-slate-450 drop-shadow scale-90 opacity-90">
                      <svg className="w-8 h-5.5 fill-current" viewBox="0 0 24 24">
                        <path d="M19.36,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.36,10.04z" />
                      </svg>
                    </div>
                    {/* Lightning Flash */}
                    <div className="absolute top-[4px] left-[16px] z-21 text-yellow-400 drop-shadow animate-[pulse_0.4s_infinite]">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M19 9h-6l3-7H7l-3 11h5l-2 9z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 2. Sunny: Birds flying left to right */}
                {weatherState === 'sunny' && (
                  <div className="absolute inset-0 pointer-events-none overflow-visible">
                    {/* Bird 1 */}
                    <div 
                      className="absolute w-4 h-3 text-indigo-500/80 dark:text-indigo-300/80 animate-[bird-fly_4s_linear_infinite]"
                      style={{ top: '-11px', animationDelay: '0s' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-[bird-flap_0.4s_ease-in-out_infinite]">
                        <path d="M2 14c3-4 7-4 10 0c3-4 7-4 10 0" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    {/* Bird 2 */}
                    <div 
                      className="absolute w-3.5 h-2.5 text-indigo-400/80 dark:text-indigo-200/80 animate-[bird-fly_4.5s_linear_infinite]"
                      style={{ top: '6px', animationDelay: '1.8s' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-[bird-flap_0.45s_ease-in-out_infinite]">
                        <path d="M2 14c3-4 7-4 10 0c3-4 7-4 10 0" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 3. Winter: Snowflakes falling */}
                {weatherState === 'winter' && (
                  <div className="absolute inset-0 pointer-events-none overflow-visible">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-slate-100 dark:text-slate-200 animate-[snow-fall_3.2s_linear_infinite] flex items-center justify-center font-bold text-[8px] select-none"
                        style={{
                          left: `${8 + i * 21}%`,
                          animationDelay: `${i * 0.65}s`,
                        }}
                      >
                        ❄
                      </div>
                    ))}
                  </div>
                )}

                {/* Weather Accessories */}
                {/* 1. Rainy: holding Umbrella */}
                {weatherState === 'rainy' && (
                  <div className="absolute right-[-14px] bottom-[14px] z-30 animate-bounce">
                    <svg className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" viewBox="0 0 24 24" fill="none">
                      {/* Umbrella Canopy */}
                      <path d="M2,12 C2,6.5 6.5,2 12,2 C17.5,2 22,6.5 22,12 H2 Z" fill="#ef4444" />
                      <path d="M6,12 C6,6.5 8.5,2 12,2 C15.5,2 18,6.5 18,12 H6 Z" fill="#ffffff" />
                      <path d="M9,12 C9,6.5 10.5,2 12,2 C13.5,2 15,6.5 15,12 H9 Z" fill="#ef4444" />
                      {/* Tip */}
                      <path d="M12,0.5 V2" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                      {/* Handle stick */}
                      <path d="M12,12 V18 C12,19.5 10.5,19.5 10,19.5" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                )}

                {/* 2. Winter: Muffler / Scarf */}
                {weatherState === 'winter' && (
                  <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-14 h-5 z-20 flex flex-col items-center">
                    {/* Main wrap */}
                    <div className="w-[46px] h-2.5 bg-gradient-to-r from-red-500 via-emerald-500 to-red-500 rounded-full border border-orange-700/20 shadow-sm" />
                    {/* Scarf tails */}
                    <div className="flex gap-0.5 justify-end w-full pr-[10px] -mt-[1px]">
                      <div className="w-[5px] h-2.5 bg-emerald-500 rounded-b shadow-sm rotate-[12deg] origin-top animate-pulse" />
                      <div className="w-[5px] h-2.5 bg-red-500 rounded-b shadow-sm rotate-[25deg] origin-top" />
                    </div>
                  </div>
                )}

                {/* 3. Sunny: Drinking Cold Drink */}
                {weatherState === 'sunny' && (
                  <div className="absolute right-[-11px] bottom-[2px] z-30 animate-pulse">
                    <svg className="w-[26px] h-[26px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]" viewBox="0 0 24 24" fill="none">
                      {/* Straw */}
                      <path d="M14,4 L11,10" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M11,10 L8,16" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
                      {/* Cup Body */}
                      <path d="M6,8 L8,20 C8,21 9,22 10,22 H14 C15,22 16,21 16,20 L18,8 H6 Z" fill="rgba(255, 255, 255, 0.45)" stroke="#cbd5e1" strokeWidth="0.75" />
                      {/* Drink Liquid */}
                      <path d="M7,12 L8.5,20 C8.5,20.5 9,21 9.5,21 H14.5 C15,21 15.5,20.5 15.5,20 L17,12 H7 Z" fill="#f97316" opacity="0.9" />
                      {/* Ice cubes */}
                      <rect x="10" y="14" width="2" height="2" rx="0.5" fill="white" opacity="0.7" transform="rotate(15 10 14)" />
                      <rect x="12" y="16" width="2" height="2" rx="0.5" fill="white" opacity="0.7" transform="rotate(-10 12 16)" />
                    </svg>
                  </div>
                )}

                {/* Tiny legs and white shoes */}
                <div className="absolute bottom-[-14px] left-0 right-0 flex justify-center gap-3.5 z-0 pointer-events-none">
                  {/* Left Leg */}
                  <div className="flex flex-col items-center origin-top animate-[leg-sway_1.4s_ease-in-out_infinite]">
                    {/* Leg stick */}
                    <div className="w-[3px] h-3.5 bg-orange-600 rounded-full" />
                    {/* White shoe */}
                    <div className="w-[11px] h-1.5 bg-white border border-slate-300 rounded-full shadow-sm -mt-[1px]" />
                  </div>
                  {/* Right Leg */}
                  <div className="flex flex-col items-center origin-top animate-[leg-sway_1.4s_ease-in-out_infinite_700ms]">
                    {/* Leg stick */}
                    <div className="w-[3px] h-3.5 bg-orange-600 rounded-full" />
                    {/* White shoe */}
                    <div className="w-[11px] h-1.5 bg-white border border-slate-300 rounded-full shadow-sm -mt-[1px]" />
                  </div>
                </div>

                {/* Spinning Solar Rays Wrapper */}
                <div className="absolute inset-0 animate-[spin_18s_linear_infinite] flex items-center justify-center pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2.5 h-4.5 bg-gradient-to-t from-orange-500 to-amber-300 rounded-full"
                      style={{
                        transform: `rotate(${i * 45}deg) translateY(-26px)`,
                        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Open/Closed Flap */}
              <div
                style={{
                  clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
                  transform: flapOpen ? 'rotateX(180deg)' : 'rotateX(0deg)',
                  zIndex: flapOpen ? 5 : 30
                }}
                className="absolute top-0 left-0 w-full h-1/2 bg-slate-200/90 dark:bg-slate-750/90 border-t border-slate-350 dark:border-slate-700 transform-origin-top transition-all duration-500"
              />

              {/* Front Pocket folds */}
              <div className="absolute bottom-0 left-0 w-full h-[112px] z-20 pointer-events-none">
                <svg className="w-full h-full drop-shadow-[0_-2px_4px_rgba(0,0,0,0.06)]" viewBox="0 0 256 112" fill="none">
                  {/* Left fold */}
                  <polygon points="0,112 0,0 128,40" className="fill-slate-200 dark:fill-slate-700" />
                  {/* Right fold */}
                  <polygon points="256,112 256,0 128,40" className="fill-slate-200 dark:fill-slate-700" />
                  {/* Bottom fold */}
                  <polygon points="0,112 256,112 128,40" className="fill-slate-300 dark:fill-slate-600" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
