const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Add Organization model before User
const orgModel = `
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String?  @unique
  tier        String   @default("STARTER") // STARTER | GROWTH | PRO | ENTERPRISE
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users          User[]
  products       Product[]
  orders         Order[]
  customers      Customer[]
  transactions   Transaction[]
  campaigns      Campaign[]
  founderNotes   FounderNote[]
  restorations   Restoration[]
  suppliers      Supplier[]
  aiSystems      AISystem[]
  brandChecks    BrandCheck[]
  agents         Agent[]
  issues         Issue[]
  events         Event[]
  approvals      Approval[]
  integrations   Integration[]
  calendarEvents CalendarEvent[]
  capabilities   Capability[]
  skills         Skill[]
  browseJobs     BrowseJob[]
  goals          Goal[]
  oauthTokens    OAuthToken[]
  contextEntries ContextEntry[]
  workflows      Workflow[]
  workspaces     Workspace[]
  artifacts      Artifact[]
}
`;

// Remove the list of relations from User model as they are moving to Organization
content = content.replace(/  preference     UserPreference\?[\s\S]*?artifacts  Artifact\[\]/m, '  preference     UserPreference?');

// Add orgModel right above model User
content = content.replace('model User {', orgModel + '\nmodel User {');

// 2. Add organizationId to User
content = content.replace('  email         String    @unique', '  email         String    @unique\n  organizationId String?\n  orgRole       String    @default("MEMBER") // FOUNDER | ADMIN | MEMBER\n  organization  Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)');

// 3. Replace all business object relations
content = content.replace(/userId\s+String(\??)/g, 'organizationId String$1');

// Fix Auth Models
content = content.replace(/model Account \{[\s\S]*?\}/m, (match) => {
  return match.replace(/organizationId\s+String(\??)/g, 'userId String$1');
});
content = content.replace(/model Session \{[\s\S]*?\}/m, (match) => {
  return match.replace(/organizationId\s+String(\??)/g, 'userId String$1');
});
content = content.replace(/model AuditLog \{[\s\S]*?\}/m, (match) => {
  return match.replace(/organizationId\s+String(\??)/g, 'userId String$1');
});

content = content.replace(/user(\s+)User(\??)(\s+)@relation\(fields: \[userId\], references: \[id\](, onDelete: [A-Za-z]+)?\)/g, 'organization$1Organization$2$3@relation(fields: [organizationId], references: [id]$4)');

content = content.replace(/model Account \{[\s\S]*?\}/m, (match) => {
  return match.replace(/organization(\s+)Organization(\??)(\s+)@relation\(fields: \[organizationId\]/g, 'user$1User$2$3@relation(fields: [userId]');
});
content = content.replace(/model Session \{[\s\S]*?\}/m, (match) => {
  return match.replace(/organization(\s+)Organization(\??)(\s+)@relation\(fields: \[organizationId\]/g, 'user$1User$2$3@relation(fields: [userId]');
});
content = content.replace(/model AuditLog \{[\s\S]*?\}/m, (match) => {
  return match.replace(/organization(\s+)Organization(\??)(\s+)@relation\(fields: \[organizationId\]/g, 'user$1User$2$3@relation(fields: [userId]');
});

content = content.replace(/@@unique\(\[userId, /g, '@@unique([organizationId, ');
content = content.replace(/@@index\(\[userId\]\)/g, '@@index([organizationId])');

fs.writeFileSync(schemaPath, content);
console.log('Schema updated successfully.');
