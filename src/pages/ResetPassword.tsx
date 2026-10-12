import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, AlertCircle, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';

type RecoveryStatus = 'verifying' | 'ready' | 'success' | 'expired' | 'no_session';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Recovery status state
  const [status, setStatus] = useState<RecoveryStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form input states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Guard against duplicate processing
  const processedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Helper: Safely clear URL hash and sensitive recovery params without reloading
    const cleanUrl = () => {
      if (typeof window !== 'undefined' && (window.location.hash || window.location.search)) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }
    };

    const processRecovery = async () => {
      // 1. Inspect URL hash and query string for error indications from Supabase
      const hash = window.location.hash;
      const search = window.location.search;
      const fullUrlParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : search);

      const urlError = fullUrlParams.get('error') || new URLSearchParams(search).get('error');
      const errorCode = fullUrlParams.get('error_code') || new URLSearchParams(search).get('error_code');
      const errorDescription = fullUrlParams.get('error_description') || new URLSearchParams(search).get('error_description');

      if (urlError || errorCode) {
        cleanUrl();
        if (mounted) {
          setStatus('expired');
          setErrorMessage(
            errorCode === 'otp_expired' || urlError === 'access_denied'
              ? 'This password reset link is invalid or has expired. Please request a new password reset link.'
              : errorDescription || 'This password reset link is invalid or has expired. Please request a new password reset link.'
          );
        }
        return;
      }

      // 2. Check for PKCE Authorization Code in query params (?code=...)
      const queryParams = new URLSearchParams(search);
      const code = queryParams.get('code');
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          cleanUrl();
          if (exchangeError) {
            if (mounted) {
              setStatus('expired');
              setErrorMessage('This password reset link is invalid or has expired. Please request a new password reset link.');
            }
            return;
          }

          // Code exchanged successfully for a valid recovery session
          sessionStorage.setItem('au_recovery_active', 'true');
          if (mounted) {
            setStatus('ready');
          }
          return;
        } catch {
          cleanUrl();
          if (mounted) {
            setStatus('expired');
            setErrorMessage('This password reset link is invalid or has expired. Please request a new password reset link.');
          }
          return;
        }
      }

      // 3. Check if recovery was already marked active in this browser tab (handles page refresh)
      const isRecoveryActive = sessionStorage.getItem('au_recovery_active') === 'true';

      // 4. Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      const hasRecoveryTokensInHash = hash.includes('type=recovery') || hash.includes('access_token');

      if (session && (isRecoveryActive || hasRecoveryTokensInHash)) {
        sessionStorage.setItem('au_recovery_active', 'true');
        cleanUrl();
        if (mounted) {
          setStatus('ready');
        }
        return;
      }

      // 5. If URL has no recovery fragments and no active recovery session exists
      if (!hasRecoveryTokensInHash && !isRecoveryActive) {
        if (mounted) {
          setStatus('no_session');
        }
        return;
      }

      // 6. Otherwise, if recovery fragments are present in hash, wait briefly for Supabase auth listener
    };

    processRecovery();

    // 7. Subscribe to Supabase auth state change events (handles implicit flow PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        processedRef.current = true;
        sessionStorage.setItem('au_recovery_active', 'true');
        cleanUrl();
        setStatus('ready');
      } else if (event === 'SIGNED_IN' && session) {
        const hash = window.location.hash;
        if (hash.includes('type=recovery') || hash.includes('access_token') || sessionStorage.getItem('au_recovery_active') === 'true') {
          sessionStorage.setItem('au_recovery_active', 'true');
          cleanUrl();
          setStatus('ready');
        }
      }
    });

    // Safety timeout in case token in hash was completely invalid or unrecognized
    const timeoutId = setTimeout(() => {
      if (mounted && status === 'verifying') {
        const isRecoveryActive = sessionStorage.getItem('au_recovery_active') === 'true';
        if (!isRecoveryActive) {
          cleanUrl();
          setStatus('expired');
          setErrorMessage('This password reset link is invalid or has expired. Please request a new password reset link.');
        }
      }
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [location]);

  // Form submit handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation 1: Length check
    if (password.length < 8) {
      setFormError('New password must be at least 8 characters long.');
      return;
    }

    // Validation 2: Matching check
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute Supabase Auth password update
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        const msg = updateError.message.toLowerCase();
        if (msg.includes('same password') || msg.includes('different from the old')) {
          setFormError('New password must be different from your old password.');
        } else if (msg.includes('expired') || msg.includes('token') || msg.includes('session')) {
          setFormError('Your password reset session has expired. Please request a new link.');
          setStatus('expired');
        } else {
          setFormError(updateError.message || 'Unable to update password. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Optionally record password_updated flag on profile
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await supabase
            .from('profiles')
            .update({ password_updated: true })
            .eq('id', session.user.id);
        }
      } catch {
        // Non-fatal profile flag update
      }

      // Clear recovery session state to prevent accidental reuse
      sessionStorage.removeItem('au_recovery_active');

      // Terminate the temporary recovery session so the user must sign in cleanly with the new password
      await supabase.auth.signOut();

      setStatus('success');
    } catch (err: any) {
      setFormError(err?.message || 'A network error occurred while updating your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password requirements calculation
  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
        
        {/* App Logo & Brand Header */}
        <div className="flex flex-col items-center justify-center space-y-3 pb-2 select-none">
          <img 
            src="/app_icon.png" 
            alt="AU Placera Logo" 
            className="h-20 w-auto object-contain rounded-2xl border border-slate-100 shadow-sm p-0.5 bg-white" 
          />
          <h1 className="text-xl font-black text-[#0B3C5D] tracking-wider uppercase">
            AU PLACERA
          </h1>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.25em] leading-none">
            Anurag University
          </span>
        </div>

        {/* 1. VERIFYING STATE */}
        {status === 'verifying' && (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Verifying Reset Link...</h2>
            <p className="text-xs text-slate-500">
              Please wait while we validate your recovery credentials.
            </p>
          </div>
        )}

        {/* 2. READY STATE: PASSWORD RESET FORM */}
        {status === 'ready' && (
          <div>
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 text-secondary mb-3">
                <KeyRound className="h-6 w-6 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create a New Password</h2>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Choose a strong password to secure your AU Placera account.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleResetPassword} autoComplete="off">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="new-password">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="w-full h-10 px-3.5 pr-10 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="confirm-new-password">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="w-full h-10 px-3.5 pr-10 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirement Checklist */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className={hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    At least 8 characters long
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${passwordsMatch ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className={passwordsMatch ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !hasMinLength || !passwordsMatch}
                  className="w-full h-10 bg-secondary hover:bg-secondary-dark disabled:bg-secondary/65 text-white font-bold tracking-wide uppercase rounded-lg text-sm select-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </div>

              {/* Back to Login link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 font-medium gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Cancel and back to login</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. SUCCESS STATE */}
        {status === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Password Reset Successful</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Your password has been reset successfully. You can now use your new password to sign in to your AU Placera account.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="w-full h-10 bg-secondary hover:bg-secondary-dark text-white font-bold tracking-wide uppercase rounded-lg text-sm select-none transition-all active:scale-[0.98]"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* 4. EXPIRED OR INVALID LINK STATE */}
        {status === 'expired' && (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-50 text-red-600 mb-2">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Link Expired or Invalid</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {errorMessage || 'This password reset link is invalid or has expired. Please request a new password reset link.'}
            </p>
            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={() => navigate('/login?mode=forgot', { replace: true })}
                className="w-full h-10 bg-secondary hover:bg-secondary-dark text-white font-bold tracking-wide uppercase rounded-lg text-sm select-none transition-all active:scale-[0.98]"
              >
                Request New Reset Link
              </button>
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-lg text-xs select-none transition-all"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* 5. DIRECT ACCESS WITHOUT RECOVERY STATE */}
        {status === 'no_session' && (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-50 text-amber-600 mb-2">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">No Active Reset Request</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              This page can only be accessed through a valid password reset link sent to your registered email address.
            </p>
            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={() => navigate('/login?mode=forgot', { replace: true })}
                className="w-full h-10 bg-secondary hover:bg-secondary-dark text-white font-bold tracking-wide uppercase rounded-lg text-sm select-none transition-all active:scale-[0.98]"
              >
                Request Password Reset
              </button>
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-lg text-xs select-none transition-all"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResetPassword;
