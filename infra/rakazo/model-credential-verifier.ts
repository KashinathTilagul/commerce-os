const BEDROCK_PROVIDER = "amazon-bedrock";
const BEDROCK_REGION = "us-east-1";

type VerifyInput = {
  provider: string;
  apiKey?: string;
  modelId?: string;
  signal?: AbortSignal;
};

export async function verifyModelCredential(input: VerifyInput, fetcher = fetch): Promise<void> {
  if (input.provider !== BEDROCK_PROVIDER) return;

  const apiKey = input.apiKey?.trim();
  const modelId = input.modelId?.trim();
  if (!apiKey || !modelId) throw new Error("Amazon Bedrock API key and model are required");

  const timeout = AbortSignal.timeout(12_000);
  const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetcher(
      `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: [{ text: "Reply OK" }] }],
          inferenceConfig: { maxTokens: 1, temperature: 0 },
        }),
        signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Amazon Bedrock did not respond within 12 seconds");
    }
    throw new Error("Could not reach Amazon Bedrock");
  }

  if (response.ok) return;
  const detail = await safeProviderError(response);
  if (response.status === 401 || response.status === 403) {
    throw new Error(`Amazon Bedrock rejected this API key${detail ? `: ${detail}` : ""}`);
  }
  throw new Error(`Amazon Bedrock could not use this model${detail ? `: ${detail}` : ""}`);
}

async function safeProviderError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const message = typeof payload.message === "string" ? payload.message : "";
    return message.replace(/[\r\n]+/g, " ").slice(0, 240);
  } catch {
    return "";
  }
}
