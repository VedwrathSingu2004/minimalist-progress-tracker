export async function signUp(email: string, password: string, name: string) {
  const res = await fetch('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Sign up failed')
  return data
}

export async function signIn(email: string, password: string, rememberMe: boolean = false) {
  const res = await fetch('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe }),
  })
  const data = await res.json()
  data.status = res.status
  if (!res.ok) throw new Error(data.message || 'Sign in failed')
  return data
}