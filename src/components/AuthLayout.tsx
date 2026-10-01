import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { GoogleIcon, InfoIcon } from './Icons'

/** Shared frame for the sign-in and create-account pages. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const { mode, supportsGoogle, signInWithGoogle } = useAuth()
  return (
    <div className="container page auth-page">
      <div className="auth-card">
        <p className="eyebrow">Confam NG account</p>
        <h1 className="auth-card__title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>

        {mode === 'demo' && (
          <div className="notice notice--info" role="note">
            <InfoIcon width={18} height={18} />
            <span>
              <strong>Demo accounts.</strong> While we finish connecting our secure account system, accounts are saved in
              this browser only. Please don’t reuse a password you use anywhere else.
            </span>
          </div>
        )}

        {/* Google sign-in is wired through AuthService and switches on in Phase 2. */}
        <button type="button" className="btn btn--secondary btn--block btn--lg" disabled={!supportsGoogle} onClick={() => void signInWithGoogle()}>
          <GoogleIcon width={18} height={18} /> Continue with Google
        </button>
        {!supportsGoogle && <p className="field-hint auth-card__soon">Google sign-in is coming soon.</p>}

        <div className="auth-card__divider"><span>or use your email</span></div>
        {children}
        <div className="auth-card__footer">{footer}</div>
      </div>
    </div>
  )
}
