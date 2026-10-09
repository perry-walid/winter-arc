import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/** Renders sheets/overlays at the app root so they stay pinned while a screen scrolls. */
export function Portal({ children }: { children: ReactNode }) {
  const host = document.getElementById('app-root')
  return host ? createPortal(children, host) : <>{children}</>
}
