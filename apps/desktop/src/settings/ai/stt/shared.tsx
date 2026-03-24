import type { ReactNode } from "react";

import type { LocalModel } from "@hypr/plugin-local-stt";

import {
  type ProviderRequirement,
  requiresEntitlement,
} from "~/settings/ai/shared/eligibility";
import { sortProviders } from "~/settings/ai/shared/sort-providers";
import { localSttQueries } from "~/stt/useLocalSttModel";

export { localSttQueries as sttModelQueries };

type Provider = {
  disabled: boolean;
  id: string;
  displayName: string;
  icon: ReactNode;
  baseUrl?: string;
  models: LocalModel[] | string[];
  badge?: string | null;
  requirements: ProviderRequirement[];
};

export const displayModelId = (model: string) => {
  return model;
};

const _PROVIDERS = [
  {
    disabled: false,
    id: "hyprnote",
    displayName: "Cactus",
    badge: "Recommended",
    icon: <img src="/assets/icon.png" alt="Cactus" className="size-5" />,
    models: [],
    requirements: [],
  },
] as const satisfies readonly Provider[];

export const PROVIDERS = sortProviders(_PROVIDERS);
export type ProviderId = (typeof _PROVIDERS)[number]["id"];

export const sttProviderRequiresPro = (providerId: ProviderId) => {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider ? requiresEntitlement(provider.requirements, "pro") : false;
};
