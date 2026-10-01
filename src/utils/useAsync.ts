import { useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Runs an async function (e.g. a ProductService call) and tracks its result.
 * Re-runs whenever a value in `deps` changes. Ignores outdated results so a
 * slow earlier request can't overwrite a newer one.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fn().then(
      (data) => active && setState({ data, loading: false, error: null }),
      (error: unknown) =>
        active && setState({ data: null, loading: false, error: error instanceof Error ? error : new Error(String(error)) }),
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
