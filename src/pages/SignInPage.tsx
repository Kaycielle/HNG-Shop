import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Loading } from '../components/EmptyState'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { AuthError } from '../services/auth/authService'
import { validateEmail } from '../utils/authValidation'
import { useDocumentTitle } from '../utils/useDocumentTitle'

/** Where to go after signing in: back where the customer came from, or their account. */
export function useReturnTo(): string {
  const state = useLocation().state as { from?: string } | null
  return state?.from && state.from.startsWith('/') ? state.from : '/account'
}

export function SignInPage() {
  useDocumentTitle('Sign in')
  const { user, ready, signIn } = useAuth()
  const navigate = useNavigate()
  const returnTo = useReturnTo()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!ready) return <div className="container page"><Loading /></div>
  if (user && !submitting) return <Navigate to={returnTo} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    const found = { email: validateEmail(email), password: password ? undefined : 'Please enter your password.' }
    setErrors(found)
    if (found.email || found.password) {
      requestAnimationFrame(() => document.getElementById(found.email ? 'signin-email' : 'signin-password')?.focus())
      return
    }
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(returnTo, { replace: true })
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : 'Sorry, we couldn’t sign you in. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see your orders and pick up your saved cart."
      footer={<>New to Confam NG? <Link to="/account/register" state={{ from: returnTo }}>Create an account</Link></>}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && <div className="notice notice--error" role="alert">{formError}</div>}
        <TextField id="signin-email" label="Email address" type="email" autoComplete="email" inputMode="email"
          value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
        <TextField id="signin-password" label="Password" type="password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting} aria-busy={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
