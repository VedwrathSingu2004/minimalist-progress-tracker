'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { data, error } = await authClient.signUp.email(
      {
        email,
        password,
        name,
        callbackURL: '/dashboard', // where to redirect after sign-up
      },
      {
        onRequest: () => setLoading(true),
        onSuccess: () => {
          setLoading(false)
          router.push('/dashboard')
        },
        onError: (ctx) => {
          setLoading(false)
          setError(ctx.error.message)
        },
      }
    )
  }

  return (
    <div className='max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md'>
      <h1 className='text-2xl font-bold mb-6'>Create an Account</h1>
      <form onSubmit={handleSignUp}>
        <div className='mb-4'>
          <label className='block text-sm font-medium mb-1'>Name</label>
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='w-full p-2 border rounded'
            required
          />
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-medium mb-1'>Email</label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='w-full p-2 border rounded'
            required
          />
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-medium mb-1'>Password</label>
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='w-full p-2 border rounded'
            required
            minLength={8}
          />
        </div>
        {error && <div className='mb-4 text-red-600 text-sm'>{error}</div>}
        <button
          type='submit'
          disabled={loading}
          className='w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50'
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  )
}