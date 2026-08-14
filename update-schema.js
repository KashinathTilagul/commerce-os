const fs = require('fs');
let schema = fs.readFileSync('apps/frontend/prisma/schema.prisma', 'utf8');

const v2Models = `
// ============ V2 OS KERNEL & EVENT BUS ============

model SystemEvent {
  id        String   @id @default(cuid())
  type      String   // e.g. WORKSPACE_UPDATED, JOB_FAILED
  source    String   // OS_KERNEL, WORKFLOW_ENGINE, PROVIDER_MANAGER
  payload   String   // JSON string
  timestamp DateTime @default(now())
  
  @@index([type])
}

// ============ V2 WORKFLOW ENGINE (DAG) ============

model Workflow {
  id          String   @id @default(cuid())
  userId      String
  name        String
  status      String   @default("PLANNING") // PLANNING | RUNNING | BLOCKED | COMPLETED | FAILED
  graphDef    String   // JSON DAG definition
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tasks       WorkflowTask[]
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model WorkflowTask {
  id           String   @id @default(cuid())
  workflowId   String
  assigneeType String   @default("AGENT") // AGENT | HUMAN | SYSTEM
  assigneeId   String?  // Agent ID or User ID
  status       String   @default("PENDING") // PENDING | RUNNING | DONE | FAILED
  dependencies String   @default("[]") // JSON array of Task IDs that must finish first
  
  workflow     Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}

// ============ V2 WORKSPACE MANAGER & REVISIONS ============

model Workspace {
  id          String   @id @default(cuid())
  userId      String
  title       String
  status      String   @default("DRAFT")
  permissions String   @default("{}") // JSON object
  metadata    String?  // JSON (Sync state, locks, etc)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  connections WorkspaceConnection[]
  revisions   WorkspaceRevision[]
  artifacts   Artifact[]
  participants AgentWorkspace[]
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model AgentWorkspace {
  agentId     String
  workspaceId String
  role        String   @default("EDITOR") // OWNER | EDITOR | VIEWER

  agent     Agent     @relation(fields: [agentId], references: [id])
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@id([agentId, workspaceId])
}

model WorkspaceConnection {
  id           String @id @default(cuid())
  workspaceId  String
  provider     String // google_drive, figma, canva, local
  resourceType String
  url          String
  
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model WorkspaceRevision {
  id          String   @id @default(cuid())
  workspaceId String
  authorId    String   // Agent or Human ID
  commitMsg   String
  diffPayload String?  // JSON diff or snapshot locator
  createdAt   DateTime @default(now())
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model Artifact {
  id              String   @id @default(cuid())
  userId          String
  workspaceId     String?
  title           String
  type            String   // PDF, EXCEL, PNG
  mimeType        String   @default("application/octet-stream")
  storageLocation String
  status          String   @default("READY")
  createdAt       DateTime @default(now())
  
  workspace Workspace? @relation(fields: [workspaceId], references: [id], onDelete: SetNull)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ============ V2 PROVIDER MANAGER ============

model ToolRegistry {
  id           String   @id @default(cuid())
  capabilityId String
  provider     String   // google, canva, local
  toolSlug     String
  priority     Int      @default(1) // 1 = preferred, 2 = fallback
  isActive     Boolean  @default(true)

  capability Capability @relation(fields: [capabilityId], references: [id], onDelete: Cascade)
}
`;

schema += v2Models;

schema = schema.replace(
  '  contextEntries ContextEntry[]',
  '  contextEntries ContextEntry[]\n  workflows Workflow[]\n  workspaces Workspace[]\n  artifacts Artifact[]'
);

schema = schema.replace(
  '  managerId       String?  // null = Chief/Founder (reports to founder); else the managing Chief\\'s id\n  createdAt       DateTime @default(now())',
  '  managerId       String?  // null = Chief/Founder (reports to founder); else the managing Chief\\'s id\n  createdAt       DateTime @default(now())\n  currentWorkflowId String?\n  memoryVectorIds String?'
);

schema = schema.replace(
  '  capabilities    Capability[]',
  '  capabilities    Capability[]\n  workspaces      AgentWorkspace[]'
);

schema = schema.replace(
  '  owner Agent @relation(fields: [ownerId], references: [id], onDelete: Cascade)',
  '  owner Agent @relation(fields: [ownerId], references: [id], onDelete: Cascade)\n  toolRegistries ToolRegistry[]'
);

fs.writeFileSync('apps/frontend/prisma/schema.prisma', schema);
console.log('Schema updated successfully');
