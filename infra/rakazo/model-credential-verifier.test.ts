import assert from "node:assert/strict";
import { verifyModelCredential } from "./model-credential-verifier.ts";

const acceptedFetch: typeof fetch = async (_url, init) => {
  assert.equal(init?.method, "POST");
  assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer valid-key");
  return new Response('{"output":{"message":{"content":[{"text":"OK"}]}}}', { status: 200 });
};

await verifyModelCredential(
  { provider: "amazon-bedrock", apiKey: "valid-key", modelId: "model/id" },
  acceptedFetch,
);

await assert.rejects(
  verifyModelCredential(
    { provider: "amazon-bedrock", apiKey: "invalid-key", modelId: "model" },
    async () => new Response('{"message":"The security token is invalid"}', { status: 403 }),
  ),
  /rejected this API key: The security token is invalid/,
);

let called = false;
await verifyModelCredential(
  { provider: "openrouter", apiKey: "not-checked-here", modelId: "model" },
  async () => {
    called = true;
    return new Response(null, { status: 500 });
  },
);
assert.equal(called, false);
