import { Link } from 'react-router-dom'
import { config } from '../config'
import { useDocumentTitle } from '../utils/useDocumentTitle'

/**
 * Privacy policy. Plain-language description of what the shop collects and why.
 * Keep this in step with what the site actually does (e.g. when payments or
 * email are added). Review it with a professional before trading at scale.
 */
const LAST_UPDATED = '1 October 2026'

export function PrivacyPage() {
  useDocumentTitle('Privacy policy')
  const contact = config.supportEmail ? (
    <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>
  ) : (
    'the contact details on our website'
  )

  return (
    <div className="container page page--narrow">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Privacy policy</li>
        </ol>
      </nav>

      <article className="legal">
        <p className="eyebrow">Last updated {LAST_UPDATED}</p>
        <h1 className="page-title">Privacy policy</h1>
        <p className="legal__lead">
          This policy explains what personal information {config.storeName} collects when you shop with us, why we need it,
          and how we look after it. We only collect what we need to run your account and deliver your orders.
        </p>

        <section>
          <h2>What we collect</h2>
          <ul>
            <li><strong>Account details:</strong> your name, email address and password when you create an account. Your password is stored securely by our account provider and we can never see it.</li>
            <li><strong>Google sign-in:</strong> if you choose “Continue with Google”, Google shares your name, email address and profile picture with us. We don’t receive your Google password or access anything else in your Google account.</li>
            <li><strong>Order details:</strong> the products you order, your phone number and your delivery address.</li>
            <li><strong>Your cart:</strong> the items you add, so your cart is still there when you come back.</li>
          </ul>
        </section>

        <section>
          <h2>How we use it</h2>
          <ul>
            <li>To create and secure your account and keep you signed in.</li>
            <li>To process, deliver and support your orders, and contact you about them.</li>
            <li>To send order confirmations and delivery updates.</li>
          </ul>
          <p>We don’t sell your information, and we don’t use it for advertising.</p>
        </section>

        <section>
          <h2>Payments</h2>
          <p>
            Payments are handled by Paystack on their own secure page. Paystack receives your email address and the order
            amount so it can process the payment; we never see or store your card or bank details. Paystack’s own privacy
            policy covers the information you give them.
          </p>
        </section>

        <section>
          <h2>Where your information is stored</h2>
          <p>
            Accounts, carts and orders are stored with Supabase, our database and account provider, with security rules
            that let each customer see only their own information. Our website is hosted on Vercel.
          </p>
        </section>

        <section>
          <h2>Cookies and browser storage</h2>
          <p>
            We use your browser’s storage to keep you signed in and to remember a guest cart before you sign in. We don’t use
            advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <p>
            We keep your account for as long as you have one. Order records are kept as long as needed for delivery, returns,
            and our legal and accounting obligations.
          </p>
        </section>

        <section>
          <h2>Your choices and rights</h2>
          <p>
            You can ask to see, correct or delete your personal information, or close your account, at any time by contacting
            us at {contact}. We aim to handle personal data in line with the Nigeria Data Protection Act 2023.
          </p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>If we change how we use your information, we’ll update this page and the date at the top.</p>
        </section>
      </article>
    </div>
  )
}
