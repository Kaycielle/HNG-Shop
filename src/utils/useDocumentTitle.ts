import { useEffect } from 'react'
import { config } from '../config'

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${config.storeName}` : `${config.storeName} — Phones, Gadgets & Accessories`
  }, [title])
}
