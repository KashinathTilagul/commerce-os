import { AppRegistry } from './registry'
import { OSPermission } from './manifest'

class OSPermissionBroker {
  /**
   * Evaluates if a specific App ID has the requested permission.
   */
  hasPermission(appId: string, permission: OSPermission): boolean {
    const app = AppRegistry.getApp(appId)
    if (!app) return false
    
    // System apps or OS Kernel extensions might bypass this, but for now we enforce strictly
    return app.permissions.includes(permission)
  }

  /**
   * Request execution with permission validation.
   * Throws an error if the app lacks the required permission.
   */
  async requestExecution<T>(appId: string, permission: OSPermission, executor: () => Promise<T>): Promise<T> {
    if (!this.hasPermission(appId, permission)) {
      console.error(`[PermissionBroker] SECURITY BLOCK: App ${appId} attempted to use ${permission} without declaring it in its manifest.`)
      throw new Error(`Permission Denied: Missing ${permission}`)
    }
    
    // Proceed with execution
    return await executor()
  }
}

export const PermissionBroker = new OSPermissionBroker()
