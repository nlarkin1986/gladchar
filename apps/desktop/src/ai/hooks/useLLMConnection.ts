import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { useMemo } from "react";

import type { CharTask } from "@hypr/api-client";
import type { AIProviderStorage } from "@hypr/store";

import { useAuth } from "~/auth";
import { useBillingAccess } from "~/auth/billing";
import { type ProviderId, PROVIDERS } from "~/settings/ai/llm/shared";
import { providerRowId } from "~/settings/ai/shared";
import {
  getProviderSelectionBlockers,
  type ProviderEligibilityContext,
} from "~/settings/ai/shared/eligibility";
import * as settings from "~/store/tinybase/store/settings";

type LanguageModelV3 = Parameters<typeof wrapLanguageModel>[0]["model"];

type LLMConnectionInfo = {
  providerId: ProviderId;
  modelId: string;
  baseUrl: string;
  apiKey: string;
};

export type LLMConnectionStatus =
  | { status: "pending"; reason: "missing_provider" }
  | { status: "pending"; reason: "missing_model"; providerId: ProviderId }
  | { status: "error"; reason: "provider_not_found"; providerId: string }
  | {
      status: "error";
      reason: "missing_config";
      providerId: ProviderId;
      missing: Array<"base_url" | "api_key">;
    }
  | { status: "success"; providerId: ProviderId; isHosted: boolean };

type LLMConnectionResult = {
  conn: LLMConnectionInfo | null;
  status: LLMConnectionStatus;
};

export const useLanguageModel = (task?: CharTask): LanguageModelV3 | null => {
  const { conn } = useLLMConnection();

  return useMemo(() => {
    if (!conn) return null;
    return createLanguageModel(conn, task);
  }, [conn, task]);
};

export const useLLMConnection = (): LLMConnectionResult => {
  const auth = useAuth();
  const billing = useBillingAccess();

  const { current_llm_provider, current_llm_model } = settings.UI.useValues(
    settings.STORE_ID,
  );
  const providerConfig = settings.UI.useRow(
    "ai_providers",
    current_llm_provider ? providerRowId("llm", current_llm_provider) : "",
    settings.STORE_ID,
  ) as AIProviderStorage | undefined;

  return useMemo<LLMConnectionResult>(
    () =>
      resolveLLMConnection({
        providerId: current_llm_provider,
        modelId: current_llm_model,
        providerConfig,
        session: auth?.session,
        isPro: billing.isPro,
      }),
    [
      auth,
      billing.isPro,
      current_llm_model,
      current_llm_provider,
      providerConfig,
    ],
  );
};

export const useLLMConnectionStatus = (): LLMConnectionStatus => {
  const { status } = useLLMConnection();
  return status;
};

const resolveLLMConnection = (params: {
  providerId: string | undefined;
  modelId: string | undefined;
  providerConfig: AIProviderStorage | undefined;
  session: { access_token: string } | null | undefined;
  isPro: boolean;
}): LLMConnectionResult => {
  const {
    providerId: rawProviderId,
    modelId,
    providerConfig,
    session,
    isPro,
  } = params;

  if (!rawProviderId) {
    return {
      conn: null,
      status: { status: "pending", reason: "missing_provider" },
    };
  }

  const providerId = rawProviderId as ProviderId;

  if (!modelId) {
    return {
      conn: null,
      status: { status: "pending", reason: "missing_model", providerId },
    };
  }

  const providerDefinition = PROVIDERS.find((p) => p.id === rawProviderId);

  if (!providerDefinition) {
    return {
      conn: null,
      status: {
        status: "error",
        reason: "provider_not_found",
        providerId: rawProviderId,
      },
    };
  }

  const baseUrl =
    providerConfig?.base_url?.trim() ||
    providerDefinition.baseUrl?.trim() ||
    "";
  const apiKey = providerConfig?.api_key?.trim() || "";

  const context: ProviderEligibilityContext = {
    isAuthenticated: !!session,
    isPro,
    config: { base_url: baseUrl, api_key: apiKey },
  };

  const blockers = getProviderSelectionBlockers(
    providerDefinition.requirements,
    context,
  );

  if (blockers.length > 0) {
    const blocker = blockers[0];
    if (blocker.code === "missing_config") {
      return {
        conn: null,
        status: {
          status: "error",
          reason: "missing_config",
          providerId,
          missing: blocker.fields,
        },
      };
    }
  }

  return {
    conn: { providerId, modelId, baseUrl, apiKey },
    status: { status: "success", providerId, isHosted: false },
  };
};

const wrapWithThinkingMiddleware = (
  model: LanguageModelV3,
): LanguageModelV3 => {
  return wrapLanguageModel({
    model,
    middleware: [
      extractReasoningMiddleware({ tagName: "think" }),
      extractReasoningMiddleware({ tagName: "thinking" }),
    ],
  });
};

const createLanguageModel = (
  conn: LLMConnectionInfo,
  _task?: CharTask,
): LanguageModelV3 => {
  switch (conn.providerId) {
    case "ollama": {
      const ollamaOrigin = new URL(conn.baseUrl.replace(/\/v1\/?$/, "")).origin;
      const ollamaFetch: typeof fetch = async (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("Origin", ollamaOrigin);
        return tauriFetch(input as RequestInfo | URL, {
          ...init,
          headers,
        });
      };
      const provider = createOpenAICompatible({
        fetch: ollamaFetch,
        name: conn.providerId,
        baseURL: conn.baseUrl,
      });
      return wrapWithThinkingMiddleware(provider.chatModel(conn.modelId));
    }

    default: {
      const config: Parameters<typeof createOpenAICompatible>[0] = {
        fetch: tauriFetch,
        name: conn.providerId,
        baseURL: conn.baseUrl,
      };
      if (conn.apiKey) {
        config.apiKey = conn.apiKey;
      }
      const provider = createOpenAICompatible(config);
      return wrapWithThinkingMiddleware(provider.chatModel(conn.modelId));
    }
  }
};
