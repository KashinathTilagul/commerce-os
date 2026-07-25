const fs = require('fs');

const fix = (file, from, to) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.split(from).join(to);
    fs.writeFileSync(file, content, 'utf8');
  }
}

// 1. apply-roster
fix('src/app/api/agents/apply-roster/route.ts', 'const users = await db.user.findMany({ select: { id: true } })', 'const users = await db.user.findMany({ select: { organizationId: true } })');
fix('src/app/api/agents/apply-roster/route.ts', 'for (const { id: userId } of users)', 'for (const { organizationId } of users)');
fix('src/app/api/agents/apply-roster/route.ts', 'userId_code: { organizationId', 'organizationId_code: { organizationId');
fix('src/app/api/agents/apply-roster/route.ts', 'where: { userId }', 'where: { organizationId }');

// 2. approvals/[id]
fix('src/app/api/approvals/[id]/route.ts', 'userId:', 'organizationId:');
fix('src/app/api/approvals/[id]/route.ts', 'userId,', 'organizationId,');

// 3. auth/signup
fix('src/app/api/auth/signup/route.ts', 'const userCaps = Object.entries(osCaps)', 'const userCaps = Object.entries(osCaps).map(([k, v]) => ({ ...v, ownerId: organization.id }))');
// Actually ownerId doesn't exist anymore in Capability, it's organizationId
fix('src/app/api/auth/signup/route.ts', 'const userCaps = Object.entries(osCaps).map(([k, v]) => ({ ...v, ownerId: organization.id }))', 'const userCaps = Object.entries(osCaps).map(([k, v]) => ({ ...v, organizationId: organization.id }))');
fix('src/app/api/auth/signup/route.ts', 'userId_name', 'organizationId_name');

// 4. cron/watchdog
fix('src/app/api/cron/watchdog/route.ts', 'userId: a.organizationId', 'organizationId: a.organizationId');

// 5. events/security
fix('src/app/api/events/security/route.ts', 'userId:', 'organizationId:');
fix('src/app/api/events/security/route.ts', 'userId,', 'organizationId,');
fix('src/app/api/events/security/route.ts', 'userId', 'organizationId'); // For any remaining

// 6. finance
fix('src/app/api/finance/route.ts', 'userId:', 'organizationId:');
fix('src/app/api/finance/route.ts', 'userId,', 'organizationId,');
fix('src/app/api/finance/route.ts', 'row._sum', 'row._sum || {}'); // to handle undefined

// 7. memory route
fix('src/app/api/memory/route.ts', 'userId:', 'organizationId:');
fix('src/app/api/memory/route.ts', 'userId,', 'organizationId,');

// 8. runtime
fix('src/lib/ai/runtime.ts', 'org.capabilities.split', '(org.capabilities || "").split');
fix('src/lib/ai/runtime.ts', 'org.context?.capabilities', 'org.capabilities');

// 9. workspace signup route 
fix('src/app/api/auth/signup/route.ts', 'name: reqData.company', 'name: reqData.company, organizationId: organization.id');
