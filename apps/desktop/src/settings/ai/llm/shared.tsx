import { Ollama } from "@lobehub/icons";
import type { ReactNode } from "react";

import {
  type ProviderRequirement,
  requiresConfigField,
} from "~/settings/ai/shared/eligibility";
import { sortProviders } from "~/settings/ai/shared/sort-providers";

type Provider = {
  id: string;
  displayName: string;
  badge: string | null;
  icon: ReactNode;
  baseUrl?: string;
  requirements: ProviderRequirement[];
  links?: {
    download?: { label: string; url: string };
    models?: { label: string; url: string };
    setup?: { label: string; url: string };
  };
};

const _PROVIDERS = [
  {
    id: "ollama",
    displayName: "Ollama",
    badge: "Recommended",
    icon: <Ollama size={16} />,
    baseUrl: "http://127.0.0.1:11434/v1",
    requirements: [],
    links: {
      download: {
        label: "Download Ollama",
        url: "https://ollama.com/download",
      },
      models: { label: "Available models", url: "https://ollama.com/library" },
      setup: {
        label: "Setup guide",
        url: "https://char.com/docs/faq/local-llm-setup/#ollama-setup",
      },
    },
  },
] as const satisfies readonly Provider[];

export const PROVIDERS = sortProviders(_PROVIDERS);
export type ProviderId = (typeof _PROVIDERS)[number]["id"];

export const llmProviderRequiresPro = (_providerId: ProviderId) => {
  return false;
};

export const llmProviderRequiresApiKey = (providerId: ProviderId) => {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider
    ? requiresConfigField(provider.requirements, "api_key")
    : false;
};
