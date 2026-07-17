import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type = 'text', onChange, value, defaultValue, name, id, allowSpecial = false, ...props }, ref) => {
  const [error, setError] = useState('');

  const validate = (val) => {
    if (allowSpecial) {
      setError('');
      return;
    }

    // Determine if special characters are allowed for this input field based on its attributes
    const allowedKeywords = [
      'email', 'password', 'subject', 'body', 'url', 'link', 'host', 
      'from_address', 'from_name', 'search', 'query', 'phone', 'tel', 
      'username', 'user_name', 'address', 'key', 'secret', 'token', 
      'signature', 'payload', 'rule', 'filter', 'value', 'code', 'otp', 
      'content', 'template', 'json', 'data', 'file', 'domain', 'match'
    ];

    const hasAllowedKeyword = (str) => {
      if (!str) return false;
      const lower = str.toLowerCase();
      return allowedKeywords.some(keyword => lower.includes(keyword));
    };

    const isSpecialAllowedField = 
      type === 'email' || 
      type === 'password' || 
      type === 'date' || 
      type === 'time' || 
      type === 'datetime-local' ||
      type === 'file' ||
      type === 'search' ||
      hasAllowedKeyword(name) ||
      hasAllowedKeyword(id) ||
      hasAllowedKeyword(props.placeholder);

    if (!isSpecialAllowedField && val) {
      // Allow letters, numbers, spaces, hyphens, and underscores
      const regex = /^[a-zA-Z0-9\s\-_]*$/;
      if (!regex.test(val)) {
        setError('Special characters are not allowed.');
        return;
      }
    }
    setError('');
  };

  // Run validation on value/defaultValue changes (mount & updates)
  useEffect(() => {
    if (value !== undefined) {
      validate(value);
    } else if (defaultValue !== undefined) {
      validate(defaultValue);
    }
  }, [value, defaultValue, name, id, type]);

  const handleChange = (e) => {
    validate(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="w-full flex flex-col gap-1">
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-none border px-4 py-2 text-sm text-slate-900 shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-850 dark:text-slate-100 dark:placeholder:text-slate-500",
          error 
            ? "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500" 
            : "border-slate-200/80 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 dark:border-slate-700/50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        value={value}
        defaultValue={defaultValue}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </span>
      )}
    </div>
  );
});
Input.displayName = 'Input';

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
));
Label.displayName = 'Label';

export { Input, Label };
