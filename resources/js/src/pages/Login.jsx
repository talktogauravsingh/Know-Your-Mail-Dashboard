import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

export default function Login() {
  const [email, setEmail] = useState('agent@example.com');
  const [password, setPassword] = useState('password');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustReset, setMustReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const login = useStore((state) => state.login);
  const resetTemporaryPassword = useStore((state) => state.resetTemporaryPassword);
  const addToast = useStore((state) => state.addToast);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await login({ email, password });
      if (response && response.must_change_password) {
        setMustReset(true);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : error.message);
      addToast(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match");
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
      const errorMsg = error.response?.data?.message || (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : error.message);
      addToast(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (mustReset) {
    return (
      <Card className="w-full shadow-lg border-slate-200/60 dark:border-slate-800/60 animate-in fade-in duration-300">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>You are logging in with a temporary password. Please set a new secure password.</CardDescription>
        </CardHeader>
        <form onSubmit={handleReset}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="newPassword">New Password</Label>
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold focus:outline-none"
                >
                  {showResetPassword ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Hide</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5" /> Show</>
                  )}
                </button>
              </div>
              <Input 
                id="newPassword" 
                type={showResetPassword ? "text" : "password"} 
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type={showResetPassword ? "text" : "password"} 
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={isLoading}>
              Update Password & Sign In
            </Button>
            <Button type="button" variant="ghost" className="w-full text-slate-500" onClick={() => setMustReset(false)}>
              Back to Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

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
              <div className="flex items-center gap-2">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold focus:outline-none"
                >
                  {showPassword ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Hide</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5" /> Show</>
                  )}
                </button>
              </div>
              <Link to="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</Link>
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
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
