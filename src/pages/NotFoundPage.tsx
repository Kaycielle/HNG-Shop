import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { useDocumentTitle } from '../utils/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="container page">
      <EmptyState
        title="Page not found."
        message="Sorry, we couldn’t find the page you were looking for."
        action={<Link to="/" className="btn btn--primary">Go to homepage</Link>}
      />
    </div>
  )
}
