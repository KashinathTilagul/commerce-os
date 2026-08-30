import { readFileSync, writeFileSync } from "node:fs";

const routerPath = process.argv[2] ?? "/app/apps/api/src/router.ts";
let source = readFileSync(routerPath, "utf8");

const importAnchor = 'import type { Auth } from "@rakazo/auth";';
const importLine = 'import { verifyModelCredential } from "./model-credential-verifier.js";';
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error("Rakazo router import anchor changed");
  source = source.replace(importAnchor, `${importLine}\n${importAnchor}`);
}

const connectAnchor = "        return persistModelCredential(deps, context.actor, {\n          provider: input.provider,";
const verifiedConnect =
  "        try {\n" +
  "          await verifyModelCredential({ ...input, signal: context.signal });\n" +
  "        } catch (error) {\n" +
  '          throw new ORPCError("BAD_REQUEST", {\n' +
  '            message: error instanceof Error ? error.message : "Could not verify model credential",\n' +
  "          });\n" +
  "        }\n" +
  connectAnchor;
if (!source.includes("await verifyModelCredential({ ...input, signal: context.signal })")) {
  if (!source.includes(connectAnchor)) throw new Error("Rakazo model connect anchor changed");
  source = source.replace(connectAnchor, verifiedConnect);
}

writeFileSync(routerPath, source);
