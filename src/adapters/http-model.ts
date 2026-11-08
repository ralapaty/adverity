import { ModelUnavailable, type ModelAdapter, type ModelPayload } from "../domain/pipeline";

type Env = Record<string, string | undefined>;

async function postJson(env: Env, fetchImpl: typeof fetch, payload: unknown): Promise<unknown> {
  if (!env.MODEL_ENDPOINT || !env.MODEL_API_KEY) throw new ModelUnavailable("Model endpoint is not configured.");
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(env.MODEL_ENDPOINT, {
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(20_000),
        headers: {
          authorization: `Bearer ${env.MODEL_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new ModelUnavailable(`Model HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw lastError instanceof ModelUnavailable ? lastError : new ModelUnavailable("Model call failed.");
}

export function createHttpModel(env: Env, fetchImpl: typeof fetch = fetch): ModelAdapter {
  const modelId = env.MODEL_ID || "configured-endpoint";
  const call = async (op: string, payload: ModelPayload) => {
    const body = await postJson(env, fetchImpl, { op, instructions: payload.instructions, data: payload.data });
    return body as { assets?: []; entries?: [] };
  };
  return {
    id: "http",
    modelId,
    async draft(payload) {
      const body = await call("draft", payload);
      return { assets: body.assets ?? [] };
    },
    async criticise(payload) {
      const body = await call("criticise", payload);
      return { entries: body.entries ?? [] };
    },
    async repair(payload) {
      const body = await call("repair", payload);
      return { assets: body.assets ?? [] };
    },
  };
}
