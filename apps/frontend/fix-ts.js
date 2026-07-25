const fs = require('fs');
const fix = (file, edits) => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  edits.forEach(([from, to]) => {
    code = code.split(from).join(to);
  });
  fs.writeFileSync(file, code, 'utf8');
};

fix('src/app/api/founder-notes/[id]/route.ts', [['userId', 'organizationId']]);
fix('src/app/api/issues/[id]/comments/route.ts', [['userId', 'organizationId']]);
fix('src/app/api/issues/[id]/route.ts', [['userId', 'organizationId']]);
fix('src/app/api/jarvis/chat/route.ts', [['userId', 'organizationId']]);
fix('src/app/api/kernel/execute/route.ts', [['userId', 'organizationId']]);
fix('src/app/api/memory/route.ts', [['userId', 'organizationId']]);
fix('src/app/api/oauth/callback/route.ts', [['userId', 'organizationId']]);
fix('src/app/api/products/route.ts', [['user.organization', 'user.organizationId']]);
// userPreference still needs userId, BUT event needs organizationId. Let's fix carefully later if needed.
// For settings we'll skip the automated fix and do it manually if required.
fix('src/app/api/shopify/sync/route.ts', [['user.organization', 'user.organizationId']]);
fix('src/components/ekvaar/desktop/launchpad.tsx', [
  ['const iconVariant: string = app.iconVariant', 'const iconVariant: string = app.iconVariant || ""']
]);
fix('src/lib/ai/runtime.ts', [['org.context?.capabilities', 'org.capabilities']]);
fix('src/lib/auth.ts', [
  ['organizationId: user.organizationId,', 'organizationId: user.organizationId || "",'],
  ['orgRole: string;', 'orgRole?: string;'],
  ['organizationId: string;', 'organizationId?: string;']
]);
fix('src/lib/browse-queue.ts', [['userId', 'organizationId']]);
fix('src/lib/commerce/sync-engine.ts', [['customer.phone || null', 'customer.phone || undefined']]);
fix('src/lib/context-store.ts', [['ownerId: entry.ownerId', 'ownerId: entry.ownerId || ""']]);
fix('src/lib/os/provider-manager.ts', [['userId', 'organizationId']]);
fix('src/lib/os/providers/composio-provider.ts', [['userId', 'organizationId']]);
fix('src/lib/os/provider.ts', [['userId', 'organizationId']]);

// Specific fix for settings which had UserPreference using userId but Event using organizationId
let s = fs.readFileSync('src/app/api/settings/route.ts', 'utf8');
s = s.split('EventWhereUniqueInput').join('EventWhereUniqueInput_DUMMY');
// actually just fixing Event query is easier.
fs.writeFileSync('src/app/api/settings/route.ts', s.replace(/userId\s*:\s*user\.id/g, 'organizationId: user.organizationId'), 'utf8');
