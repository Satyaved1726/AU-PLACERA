import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { authService } from '../features/auth/authService';
import { AnuragLogo } from '../components/common/AnuragLogo';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user, profile } = useAuth();

  // Mode state: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Student specific details for SignUp
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [section, setSection] = useState('AIML-A');
  const year = 4;
  const batch = '2023-2027';

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'super_admin') {
        navigate('/super-admin/dashboard', { replace: true });
      } else if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/student/notice-board', { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const translateAuthError = (err: string): string => {
    const msg = err.toLowerCase();
    if (msg.includes('profile')) {
      return err;
    }
    if (
      msg.includes('invalid login credentials') || 
      msg.includes('invalid credentials') || 
      msg.includes('invalid grant')
    ) {
      return 'Invalid email or password.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Please verify your email before signing in.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Unable to connect to the placement portal.';
    }
    // Return original Supabase error message for debugging/specific diagnostics
    return err;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    console.log('[AUTH] Login submitted');

    try {
      const { error, user: authUser, profile: authProfile } = await signIn(email.trim(), password);
      console.log('[AUTH] Supabase response received');
      console.log('[AUTH] Has session:', !!authUser);

      if (error) {
        console.log('[AUTH] Login failed:', error);
        setErrorMsg(translateAuthError(error));
        setIsLoading(false);
        return;
      }

      if (authUser) {
        console.log('[AUTH] User ID:', authUser.id);
        console.log('[AUTH] User email:', authUser.email);
        console.log('[AUTH] Profile lookup started');
        
        if (authProfile) {
          console.log('[AUTH] Profile found: true');
          console.log('[AUTH] Role:', authProfile.role);
          if (authProfile.status === 'suspended' || authProfile.status === 'inactive') {
            setErrorMsg('Your administrator account has been suspended. Please contact the Super Admin.');
            setIsLoading(false);
            await authService.signOut();
            return;
          }
          if (authProfile.role === 'super_admin') {
            navigate('/super-admin/dashboard');
          } else if (authProfile.role === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/student/notice-board');
          }
        } else {
          console.log('[AUTH] Profile found: false');
          setErrorMsg('Your account was created successfully, but your AU Placera profile has not been configured yet.');
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      console.error('[AUTH] Connection exception:', err);
      setErrorMsg('Unable to connect to the placement portal.');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !rollNumber) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedRoll = rollNumber.toUpperCase().trim();

    // 1. Domain validation
    if (!trimmedEmail.endsWith('@anurag.edu.in')) {
      setErrorMsg('Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.');
      return;
    }

    // 2. Validate roll number regex: 23EG107 followed by A-F and two alphanumeric characters
    const rollRegex = /^23EG107[A-F][0-9A-Z]{2}$/;
    if (!rollRegex.test(trimmedRoll)) {
      setErrorMsg('Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.');
      return;
    }

    // 3. Email prefix must match roll number
    const emailPrefix = trimmedEmail.split('@')[0];
    if (emailPrefix !== trimmedRoll.toLowerCase()) {
      setErrorMsg('Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.');
      return;
    }

    // 4. Section validation based on roll number character
    const sectionChar = trimmedRoll.charAt(7); // Index 7 is the 8th character: 23EG107[A-F]
    if (section !== `AIML-${sectionChar}`) {
      setErrorMsg('Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.');
      return;
    }

    // 5. Strict batch and year check
    if (year !== 4 || batch.trim() !== '2023-2027') {
      setErrorMsg('Access restricted. AU Placera is currently available only to eligible 4th-year students of the 23EG107 A–F sections using their official Anurag University email.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await authService.signUp(
        email.trim(),
        password,
        fullName.trim(),
        rollNumber.trim(),
        section,
        year,
        batch.trim()
      );

      if (error) {
        setErrorMsg(error);
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Registration submitted! Please verify your email to activate your account.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setRollNumber('');
      setMode('login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await authService.resetPassword(email.trim());
      if (error) {
        setErrorMsg(error);
        setIsLoading(false);
        return;
      }
      setSuccessMsg('If this account exists, a password reset link has been sent.');
      setEmail('');
      setMode('login');
    } catch (err: any) {
      setErrorMsg('Unable to trigger password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
        
        {/* App Logo & Brand Header */}
        <div className="flex flex-col items-center justify-center space-y-3 pb-2 select-none">
          <AnuragLogo height={56} showText={false} />
          <h1 className="text-xl font-black text-[#0B3C5D] tracking-wider uppercase">
            AU PLACERA
          </h1>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.25em] leading-none">
            Anurag University
          </span>
        </div>
        
        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-semibold">
            {successMsg}
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && (
          <div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Login</h2>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSignIn} autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@anurag.edu.in"
                  autoComplete="off"
                  className="w-full h-10 px-3.5 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full h-10 px-3.5 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="mr-2 h-4 w-4 text-secondary focus:ring-0 rounded"
                  />
                  <span>Show Password</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('forgot');
                  }}
                  className="text-xs text-secondary hover:text-secondary-dark font-medium"
                >
                  Forgot Username / Password?
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-secondary hover:bg-secondary-dark disabled:bg-secondary/65 text-white font-bold tracking-wide uppercase rounded-lg text-sm select-none transition-all active:scale-[0.98]"
                >
                  {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('signup');
                  }}
                  className="text-xs text-secondary hover:text-secondary-dark font-medium"
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. SIGN UP MODE */}
        {mode === 'signup' && (
          <div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sign Up</h2>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSignUp}>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-name">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full h-10 px-3.5 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-email">
                  College Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rollnumber@anurag.edu.in"
                  className="w-full h-10 px-3.5 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-roll">
                  Roll Number
                </label>
                <input
                  id="signup-roll"
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 23EG107A"
                  className="w-full h-10 px-3.5 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-section">
                    Section
                  </label>
                  <select
                    id="signup-section"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full h-10 px-2.5 border border-slate-350 rounded-lg text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                  >
                    <option value="AIML-A">AIML-A</option>
                    <option value="AIML-B">AIML-B</option>
                    <option value="AIML-C">AIML-C</option>
                    <option value="AIML-D">AIML-D</option>
                    <option value="AIML-E">AIML-E</option>
                    <option value="AIML-F">AIML-F</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-year">
                    Year
                  </label>
                  <select
                    id="signup-year"
                    value={year}
                    disabled
                    className="w-full h-10 px-2.5 border border-slate-350 rounded-lg text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-slate-55 text-slate-800 cursor-not-allowed"
                  >
                    <option value={4}>4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-batch">
                    Batch
                  </label>
                  <input
                    id="signup-batch"
                    type="text"
                    readOnly
                    value={batch}
                    placeholder="2023-2027"
                    className="w-full h-10 px-2.5 border border-slate-350 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-slate-55 text-slate-800 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-password">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="signup-confirm">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="mr-2 h-4 w-4 text-secondary focus:ring-0 rounded"
                  />
                  <span>Show Password</span>
                </label>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('login');
                  }}
                  className="w-1/2 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-lg text-xs select-none transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-1/2 h-10 bg-secondary hover:bg-secondary-dark disabled:bg-secondary/65 text-white font-bold uppercase rounded-lg text-xs select-none transition-all active:scale-[0.98]"
                >
                  {isLoading ? 'Creating...' : 'REGISTER'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. FORGOT PASSWORD MODE */}
        {mode === 'forgot' && (
          <div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Forgot Password</h2>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Enter your email address and we'll send you a password reset link.
              </p>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleForgot}>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@anurag.edu.in"
                  className="w-full h-10 px-3.5 border border-slate-350 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 bg-white text-slate-800"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('login');
                  }}
                  className="w-1/2 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-lg text-xs select-none transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-1/2 h-10 bg-secondary hover:bg-secondary-dark disabled:bg-secondary/65 text-white font-bold uppercase rounded-lg text-xs select-none transition-all active:scale-[0.98]"
                >
                  {isLoading ? 'Sending...' : 'SUBMIT'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
