'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Github,
  Loader2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { qualyFontFamily } from '@/lib/fonts'
import { signIn, signUp } from '@/lib/api/auth'
import router from 'next/router'

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox='0 0 24 24'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
      fill='#4285F4'
    />
    <path
      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      fill='#34A853'
    />
    <path
      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
      fill='#FBBC05'
    />
    <path
      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      fill='#EA4335'
    />
  </svg>
)

const AuthPage = () => {
  // ─── State ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // ─── Handlers ───────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // setError('')
    try {
      await signIn(loginForm.email, loginForm.password, rememberMe)
      router.push('/dashboard')
    } catch (err) {
      // setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // setError('')
    try {
      await signUp(signupForm.email, signupForm.password, signupForm.name)
      router.push('/dashboard')
    } catch (err) {
      // setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`)
  }

  // ─── Password Strength Helper ──────────────────────────
  const getPasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 6) score++
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return Math.min(score, 4)
  }

  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'Too weak — use at least 8 characters'
      case 2:
        return 'Weak — try adding numbers or symbols'
      case 3:
        return 'Good — consider adding more variety'
      case 4:
        return 'Strong password'
      default:
        return ''
    }
  }

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500'
      case 2:
        return 'bg-orange-500'
      case 3:
        return 'bg-yellow-500'
      case 4:
        return 'bg-green-500'
      default:
        return 'bg-muted'
    }
  }

  const passwordStrength = getPasswordStrength(signupForm.password)

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className='min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8'>
      {/* ─── Background Decorations ─── */}
      <div className='pointer-events-none fixed inset-0 overflow-hidden'>
        <div className='absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl' />
        <div className='absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl' />
      </div>

      {/* ─── Logo ─── */}
      <div className='relative z-10 mb-8 flex items-center gap-3'>
        <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25'>
          <Sparkles className='h-6 w-6 text-primary-foreground' />
        </div>
        <span className={`text-2xl font-bold tracking-tight ${qualyFontFamily.className}`}>Minimalist Progress Tracker</span>
      </div>

      {/* ─── Auth Card ─── */}
      <Card className='relative z-10 w-full max-w-lg border-border/50 shadow-2xl shadow-black/5'>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full'
        >
          <CardHeader className='space-y-5 pb-2'>
            <div className='space-y-2 text-center'>
              <CardTitle className='text-2xl font-bold tracking-tight sm:text-3xl'>
                {activeTab === 'login' ? 'Please Sign In' : 'Create your account'}
              </CardTitle>
              <CardDescription className='text-sm text-muted-foreground sm:text-base'>
                {activeTab === 'login'
                  ? 'Enter your credentials to access your account'
                  : 'Fill in your details to get started for free'}
              </CardDescription>
            </div>

            <TabsList className='grid h-12 w-full grid-cols-2'>
              <TabsTrigger
                value='login'
                className='text-sm font-semibold data-[state=active]:shadow-sm'
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value='signup'
                className='text-sm font-semibold data-[state=active]:shadow-sm'
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className='space-y-5 px-6 pb-4 pt-2 sm:px-8'>
            {/* ─── Social Login ─── */}
            <div className='grid grid-cols-2 gap-3'>
              <Button
                variant='outline'
                className='h-12 gap-2.5 text-sm font-medium transition-all hover:bg-accent/80'
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                <GoogleIcon className='h-5 w-5' />
                Google
              </Button>
              <Button
                variant='outline'
                className='h-12 gap-2.5 text-sm font-medium transition-all hover:bg-accent/80'
                onClick={() => handleSocialLogin('github')}
                disabled={isLoading}
              >
                <Github className='h-5 w-5' />
                GitHub
              </Button>
            </div>

            {/* ─── Divider ─── */}
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <Separator className='w-full' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-card px-3 font-medium text-muted-foreground'>
                  or continue with email
                </span>
              </div>
            </div>

            {/* ─── Login Form ─── */}
            <TabsContent value='login' className='mt-0 space-y-5'>
              <form onSubmit={handleLogin} className='space-y-5'>
                {/* Email */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='login-email'
                    className='text-sm font-medium'
                  >
                    Email Address
                  </Label>
                  <div className='relative'>
                    <Mail className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      id='login-email'
                      type='email'
                      placeholder='name@example.com'
                      className='h-12 pl-11 text-sm'
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, email: e.target.value })
                      }
                      required
                      disabled={isLoading}
                      autoComplete='email'
                    />
                  </div>
                </div>

                {/* Password */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label
                      htmlFor='login-password'
                      className='text-sm font-medium'
                    >
                      Password
                    </Label>
                    <Button
                      type='button'
                      variant='link'
                      className='h-auto px-0 text-xs font-medium text-muted-foreground hover:text-primary'
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <div className='relative'>
                    <Lock className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      id='login-password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Enter your password'
                      className='h-12 pl-11 pr-11 text-sm'
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({
                          ...loginForm,
                          password: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      autoComplete='current-password'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className='flex items-center space-x-2.5'>
                  <Checkbox
                    id='remember'
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked as boolean)
                    }
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor='remember'
                    className='cursor-pointer text-sm font-normal text-muted-foreground'
                  >
                    Remember me for 30 days
                  </Label>
                </div>

                {/* Submit */}
                <Button
                  type='submit'
                  className='h-12 w-full text-sm font-semibold'
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className='ml-2 h-4 w-4' />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ─── Signup Form ─── */}
            <TabsContent value='signup' className='mt-0 space-y-5'>
              <form onSubmit={handleSignup} className='space-y-5'>
                {/* Full Name */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='signup-name'
                    className='text-sm font-medium'
                  >
                    Full Name
                  </Label>
                  <div className='relative'>
                    <User className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      id='signup-name'
                      type='text'
                      placeholder='John Doe'
                      className='h-12 pl-11 text-sm'
                      value={signupForm.name}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          name: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      autoComplete='name'
                    />
                  </div>
                </div>

                {/* Email */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='signup-email'
                    className='text-sm font-medium'
                  >
                    Email Address
                  </Label>
                  <div className='relative'>
                    <Mail className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      id='signup-email'
                      type='email'
                      placeholder='name@example.com'
                      className='h-12 pl-11 text-sm'
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          email: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      autoComplete='email'
                    />
                  </div>
                </div>

                {/* Password */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='signup-password'
                    className='text-sm font-medium'
                  >
                    Password
                  </Label>
                  <div className='relative'>
                    <Lock className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      id='signup-password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Create a strong password'
                      className='h-12 pl-11 pr-11 text-sm'
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          password: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      autoComplete='new-password'
                      minLength={8}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
                  </div>

                  {/* Password Strength Indicator */}
                  {signupForm.password && (
                    <div className='space-y-2 pt-1'>
                      <div className='flex gap-1.5'>
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              passwordStrength >= level
                                ? getStrengthColor(passwordStrength)
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {getStrengthLabel(passwordStrength)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='signup-confirm-password'
                    className='text-sm font-medium'
                  >
                    Confirm Password
                  </Label>
                  <div className='relative'>
                    <Lock className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      id='signup-confirm-password'
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder='Confirm your password'
                      className={`h-12 pl-11 pr-11 text-sm transition-colors ${
                        signupForm.confirmPassword &&
                        signupForm.password !== signupForm.confirmPassword
                          ? 'border-destructive focus-visible:ring-destructive'
                          : signupForm.confirmPassword &&
                              signupForm.password ===
                                signupForm.confirmPassword
                            ? 'border-green-500 focus-visible:ring-green-500'
                            : ''
                      }`}
                      value={signupForm.confirmPassword}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      autoComplete='new-password'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                  {signupForm.confirmPassword &&
                    signupForm.password !== signupForm.confirmPassword && (
                      <p className='text-xs text-destructive'>
                        Passwords do not match
                      </p>
                    )}
                  {signupForm.confirmPassword &&
                    signupForm.password === signupForm.confirmPassword &&
                    signupForm.confirmPassword.length > 0 && (
                      <p className='flex items-center gap-1 text-xs text-green-600 dark:text-green-400'>
                        <CheckCircle2 className='h-3 w-3' />
                        Passwords match
                      </p>
                    )}
                </div>

                {/* Terms */}
                <div className='flex items-start space-x-2.5'>
                  <Checkbox
                    id='terms'
                    checked={agreedToTerms}
                    onCheckedChange={(checked) =>
                      setAgreedToTerms(checked as boolean)
                    }
                    disabled={isLoading}
                    className='mt-0.5'
                  />
                  <Label
                    htmlFor='terms'
                    className='cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground'
                  >
                    I agree to the{' '}
                    <Button
                      type='button'
                      variant='link'
                      className='h-auto px-0 text-sm font-medium underline underline-offset-4'
                    >
                      Terms of Service
                    </Button>{' '}
                    and{' '}
                    <Button
                      type='button'
                      variant='link'
                      className='h-auto px-0 text-sm font-medium underline underline-offset-4'
                    >
                      Privacy Policy
                    </Button>
                  </Label>
                </div>

                {/* Submit */}
                <Button
                  type='submit'
                  className='h-12 w-full text-sm font-semibold'
                  disabled={
                    isLoading ||
                    !agreedToTerms ||
                    signupForm.password !== signupForm.confirmPassword ||
                    !signupForm.confirmPassword
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className='ml-2 h-4 w-4' />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </CardContent>

          <CardFooter className='px-6 pb-6 pt-0 sm:px-8'>
            <p className='w-full text-center text-sm text-muted-foreground'>
              {activeTab === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <Button
                    variant='link'
                    className='h-auto px-0 text-sm font-semibold'
                    onClick={() => setActiveTab('signup')}
                  >
                    Sign up for free
                  </Button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Button
                    variant='link'
                    className='h-auto px-0 text-sm font-semibold'
                    onClick={() => setActiveTab('login')}
                  >
                    Sign in instead
                  </Button>
                </>
              )}
            </p>
          </CardFooter>
        </Tabs>
      </Card>

      {/* ─── Security Badge ─── */}
      <div className='relative z-10 mt-6 flex items-center gap-2 text-xs text-muted-foreground'>
        <ShieldCheck className='h-4 w-4' />
        <span>Protected by enterprise-grade security</span>
      </div>
    </div>
  )
}

export default AuthPage