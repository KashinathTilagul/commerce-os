// VIEWER is a read-only organisation role (e.g. grant reviewers).
// Any state-changing API call from a VIEWER is refused; sign-in/out stays allowed.
export const VIEWER_ROLE = 'VIEWER'

export function isViewerWriteBlocked(method: string, path: string, orgRole?: string) {
  if (orgRole !== VIEWER_ROLE) return false
  if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return false
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}
