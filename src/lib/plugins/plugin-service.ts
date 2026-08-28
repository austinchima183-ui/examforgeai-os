// ============================================================================
// ExamForge AI — Plugin Service (Facade)
// ============================================================================
// Thin facade that re-exports plugin marketplace + lifecycle functions under the
// names expected by the admin API route (`/api/admin/plugins`).
// ============================================================================

import { searchPlugins, getFeaturedPlugins } from './plugin-registry'
import { installPlugin, uninstallPlugin } from './plugin-lifecycle'

/** List all available (marketplace) plugins */
export async function getAvailablePlugins() {
  const [all, featured] = await Promise.all([
    searchPlugins({ query: '', limit: 100 }),
    getFeaturedPlugins(),
  ])
  return { all, featured }
}

export { installPlugin, uninstallPlugin }
