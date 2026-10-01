import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Loading } from '../components/EmptyState'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { AuthError } from '../services/auth/authService'
import { PASSWORD_MIN, validateConfirm, validateEmail, validateName, validateNewPassword } from '../utils/authValidation'
import { useDocumentTitle } from '../utils/useDocumentTitle'
import { useReturnTo } from './SignInPage'

type Field = 'name' | 'email' | 'password' | 'confirm'

export function RegisterPage() {
  useDocumentTitle('Create an account')
  const { user, ready, register } = useAuth()
  const navigate = useNavigate()
  const returnTo = useReturnTo()
  const [form, setForm] = useState<Record<Field, string>>({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmEmailFor, setConfirmEmailFor] = useState('')

  if (!ready) return <div className="container page"><Loading /></div>
  if (user && !submitting) return <Navigate to={returnTo} replace />

  if (confirmEmailFor) {
    return (
      <div className="container page auth-page">
        <div className="auth-card" role="status">
          <p className="eyebrow">Almost there</p>
          <h1 className="auth-card__title">Check your email</h1>
          <p className="page-subtitle">
            We’ve sent a confirmation link to <strong>{confirmEmailFor}</strong>. Click it to activate your account, then
            sign in. It can take a minute to arrive — check your spam folder too.
          </p>
          <Link to="/account/sign-in" state={{ from: returnTo }} className="btn btn--primary btn--lg btn--block">Go to sign in</Link>
        </div>
      </div>
    )
  }

  const validate = (f: Record<Field, string>) => ({
    name: validateName(f.name),
    email: validateEmail(f.email),
    password: validateNewPassword(f.password),
    confirm: validateConfirm(f.password, f.confirm),
  })

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [field]: e.target.value }
    setForm(next)
    // Re-check fields that already show an error, as the customer fixes them.
    if (errors[field] || (field === 'password' && errors.confirm)) {
      const all = validate(next)
      setErrors((prev) => ({ ...prev, [field]: all[field], ...(field === 'password' && prev.confirm ? { confirm: all.confirm } : {}) }))
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    const found = validate(form)
    setErrors(found)
    const firstProblem = (Object.keys(found) as Field[]).find((f) => found[f])
    if (firstProblem) {
      // Move the cursor to the first field that needs fixing.
      requestAnimationFrame(() => document.getElementById(`reg-${firstProblem}`)?.focus())
      return
    }
    setSubmitting(true)
    try {
      const result = await register({ name: form.name, email: form.email, password: form.password })
      if (result.needsEmailConfirmation) {
        setConfirmEmailFor(form.email.trim())
        setSubmitting(false)
        return
      }
      navigate(returnTo, { replace: true })
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : 'Sorry, we couldn’t create your account. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Save your cart, check out faster and keep track of your orders."
      footer={<>Already have an account? <Link to="/account/sign-in" state={{ from: returnTo }}>Sign in</Link></>}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && <div className="notice notice--error" role="alert">{formError}</div>}
        <TextField id="reg-name" label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />
        <TextField id="reg-email" label="Email address" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <TextField id="reg-password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')}
          error={errors.password} hint={`At least ${PASSWORD_MIN} characters, with a letter and a number.`} required />
        <TextField id="reg-confirm" label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />
        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting} aria-busy={submitting}>
          {submitting ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
