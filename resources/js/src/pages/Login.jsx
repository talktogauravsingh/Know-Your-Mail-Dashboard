import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { ShieldCheck, Mail, Key, KeyRound, AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'temp_reset' | 'forgot' | 'pending_info' | 'otp_reset'
  const [isLoading, setIsLoading] = useState(false);
  
  // Password visibility states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const login = useStore((state) => state.login);
  const resetTemporaryPassword = useStore((state) => state.resetTemporaryPassword);
  const forgotPassword = useStore((state) => state.forgotPassword);
  const resetPassword = useStore((state) => state.resetPassword);
  const addToast = useStore((state) => state.addToast);
  const navigate = useNavigate();

  // Restore password reset flow if the user previously requested a reset, checked against DB
  useEffect(() => {
    const savedEmail = localStorage.getItem('pending_reset_email');
    if (savedEmail) {
      setIsLoading(true);
      forgotPassword(savedEmail)
        .then((response) => {
          setEmail(savedEmail);
          if (response.status === 'otp_sent') {
            setAuthMode('otp_reset');
          } else if (response.status === 'request_pending') {
            setAuthMode('pending_info');
          }
        })
        .catch(() => {
          // If no active request exists in DB, clean up local cache
          localStorage.removeItem('pending_reset_email');
          localStorage.removeItem('pending_reset_mode');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await login({ email, password });
      
      // Successfully logged in normally: clear any pending reset status
      localStorage.removeItem('pending_reset_email');
      localStorage.removeItem('pending_reset_mode');
      
      if (response && response.must_change_password) {
        setAuthMode('temp_reset');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed';
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTempReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match", 'error');
      return;
    }
    setIsLoading(true);
    try {
      await resetTemporaryPassword({
        email,
        temporary_password: password,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Password reset failed';
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await forgotPassword(email);
      if (response.status === 'otp_sent') {
        localStorage.setItem('pending_reset_email', email);
        localStorage.setItem('pending_reset_mode', 'otp_reset');
        setAuthMode('otp_reset');
        addToast(response.message, 'success');
      } else if (response.status === 'request_pending') {
        localStorage.setItem('pending_reset_email', email);
        localStorage.setItem('pending_reset_mode', 'otp_reset');
        setAuthMode('pending_info');
        addToast(response.message, 'success');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Request failed';
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match", 'error');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword({
        email,
        otp,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      
      // Clear pending state on successful reset
      localStorage.removeItem('pending_reset_email');
      localStorage.removeItem('pending_reset_mode');
      
      setAuthMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Password reset failed';
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Temporary Password Reset mode
  if (authMode === 'temp_reset') {
    return (
      <Card className="w-full shadow-lg border-slate-200/60 dark:border-slate-800/60 animate-in fade-in duration-300">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>You are logging in with a temporary password. Please set a new secure password.</CardDescription>
        </CardHeader>
        <form onSubmit={handleTempReset}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input 
                  id="newPassword" 
                  type={showNewPassword ? "text" : "password"} 
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {newPassword && confirmPassword && (
                newPassword === confirmPassword ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                  </p>
                ) : (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1 font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Passwords do not match
                  </p>
                )
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={isLoading}>
              Update Password & Sign In
            </Button>
            <Button type="button" variant="ghost" className="w-full text-slate-500" onClick={() => setAuthMode('login')}>
              Back to Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  // 2. Forgot Password request mode
  if (authMode === 'forgot') {
    return (
      <Card className="w-full shadow-lg border-slate-200/60 dark:border-slate-800/60 animate-in fade-in duration-300">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
            <KeyRound className="w-6 h-6 text-indigo-600" /> Forgot Password
          </CardTitle>
          <CardDescription>Enter your email address to request a password reset.</CardDescription>
        </CardHeader>
        <form onSubmit={handleForgotPassword}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">Email Address</Label>
              <Input 
                id="forgotEmail" 
                type="email" 
                placeholder="m@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={isLoading}>
              Submit Request
            </Button>
            <Button type="button" variant="ghost" className="w-full text-slate-500 flex items-center justify-center gap-1.5" onClick={() => setAuthMode('login')}>
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  // 3. Pending confirmation info mode (for low-privileged roles)
  if (authMode === 'pending_info') {
    return (
      <Card className="w-full shadow-lg border-slate-200/60 dark:border-slate-800/60 animate-in fade-in duration-300">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2 text-amber-600">
            <AlertCircle className="w-6 h-6" /> Request Pending
          </CardTitle>
          <CardDescription>Administrator approval required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Your password reset request has been submitted to your organization's administrators.
          </p>
          <p className="text-xs text-slate-500">
            Once approved, you will receive an email containing a 6-digit OTP code to update your password.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button type="button" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setAuthMode('otp_reset')}>
            Enter Reset OTP
          </Button>
          <Button type="button" variant="ghost" className="w-full text-slate-500" onClick={() => setAuthMode('login')}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // 4. Reset Password with OTP mode
  if (authMode === 'otp_reset') {
    return (
      <Card className="w-full shadow-lg border-slate-200/60 dark:border-slate-800/60 animate-in fade-in duration-300">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Your Password</CardTitle>
          <CardDescription>Enter the OTP received on your email and choose your new password.</CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="resetEmail">Email Address</Label>
              <Input 
                id="resetEmail" 
                type="email" 
                placeholder="m@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="otp">Verification OTP</Label>
              <Input 
                id="otp" 
                type="text" 
                placeholder="6-digit code" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required 
                maxLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input 
                  id="newPassword" 
                  type={showNewPassword ? "text" : "password"} 
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {newPassword && confirmPassword && (
                newPassword === confirmPassword ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
                    <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                  </p>
                ) : (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
                    <XCircle className="w-3.5 h-3.5" /> Passwords do not match
                  </p>
                )
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={isLoading}>
              Reset Password
            </Button>
            <Button type="button" variant="ghost" className="w-full text-slate-500" onClick={() => setAuthMode('login')}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  // 5. Default login view
  return (
    <Card className="w-full shadow-lg border-slate-200/60 dark:border-slate-800/60">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription>Enter your email to sign in to your dashboard</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="m@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button 
                type="button" 
                onClick={() => setAuthMode('forgot')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 animate-pulse"
              >
                Forgot password?
              </button>
            </div>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={isLoading}>
            Sign In
          </Button>
          <div className="text-center text-sm text-slate-500">
            Don&apos;t have an account? <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">Sign up</Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
