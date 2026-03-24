import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/utils";

import { HealthStatusIndicator, useConnectionHealth } from "./health";
import { PROVIDERS } from "./shared";

import { useAuth } from "~/auth";
import { useBillingAccess } from "~/auth/billing";
import { providerRowId } from "~/settings/ai/shared";
import { getProviderSelectionBlockers } from "~/settings/ai/shared/eligibility";
import { type ListModelsResult } from "~/settings/ai/shared/list-common";
import { listOllamaModels } from "~/settings/ai/shared/list-ollama";
import { listGenericModels } from "~/settings/ai/shared/list-openai";
import { ModelCombobox } from "~/settings/ai/shared/model-combobox";
import { useConfigValues } from "~/shared/config";
import * as settings from "~/store/tinybase/store/settings";

export function SelectProviderAndModel() {
  const configuredProviders = useConfiguredMapping();

  const { current_llm_model, current_llm_provider } = useConfigValues([
    "current_llm_model",
    "current_llm_provider",
  ] as const);

  const health = useConnectionHealth();
  const isConfigured = !!(current_llm_provider && current_llm_model);
  const hasError = isConfigured && health.status === "error";

  const handleSelectProvider = settings.UI.useSetValueCallback(
    "current_llm_provider",
    (provider: string) => provider,
    [],
    settings.STORE_ID,
  );
  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_llm_model",
    (model: string) => model,
    [],
    settings.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      provider: current_llm_provider || "",
      model: current_llm_model || "",
    },
    listeners: {
      onChange: ({ formApi }) => {
        const {
          form: { errors },
        } = formApi.getAllErrors();
        if (errors.length > 0) {
          console.log(errors);
        }

        void formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      handleSelectProvider(value.provider);
      handleSelectModel(value.model);
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-serif font-semibold">Model being used</h3>
      <div
        className={cn([
          "flex flex-col gap-4",
          "rounded-xl border border-neutral-200 p-4",
          !isConfigured || hasError ? "bg-red-50" : "bg-neutral-50",
        ])}
      >
        <div className="flex flex-row items-center gap-4">
          <form.Field
            name="provider"
            listeners={{
              onChange: () => {
                form.setFieldValue("model", "");
              },
            }}
          >
            {(field) => (
              <div className="min-w-0 flex-2" data-llm-provider-selector>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    field.handleChange(value);
                  }}
                >
                  <SelectTrigger className="bg-white shadow-none focus:ring-0">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => {
                      const status = configuredProviders[provider.id];

                      return (
                        <SelectItem
                          key={provider.id}
                          value={provider.id}
                          disabled={!status?.listModels}
                        >
                          <div className="flex items-center gap-2">
                            {provider.icon}
                            <span>{provider.displayName}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <span className="text-neutral-500">/</span>

          <form.Field name="model">
            {(field) => {
              const providerId = form.getFieldValue("provider");
              const status = configuredProviders[providerId];

              return (
                <div className="min-w-0 flex-3">
                  <ModelCombobox
                    providerId={providerId}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                    disabled={!status?.listModels}
                    listModels={status?.listModels}
                    isConfigured={isConfigured}
                    suffix={
                      isConfigured ? <HealthStatusIndicator /> : undefined
                    }
                  />
                </div>
              );
            }}
          </form.Field>
        </div>

        {!isConfigured && (
          <div className="flex items-center gap-2 border-t border-red-200 pt-2">
            <span className="text-sm text-red-600">
              <strong className="font-medium">Language model</strong> is needed
              to make Char summarize and chat about your conversations.
            </span>
          </div>
        )}

        {hasError && health.message && (
          <div className="flex items-center gap-2 border-t border-red-200 pt-2">
            <span className="text-sm text-red-600">{health.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

type ProviderStatus = {
  listModels?: () => Promise<ListModelsResult>;
};

function useConfiguredMapping(): Record<string, ProviderStatus> {
  const auth = useAuth();
  const billing = useBillingAccess();
  const configuredProviders = settings.UI.useResultTable(
    settings.QUERIES.llmProviders,
    settings.STORE_ID,
  );

  const mapping = useMemo(() => {
    return Object.fromEntries(
      PROVIDERS.map((provider) => {
        const config = configuredProviders[providerRowId("llm", provider.id)];
        const baseUrl = String(
          config?.base_url || provider.baseUrl || "",
        ).trim();
        const apiKey = String(config?.api_key || "").trim();

        const eligible =
          getProviderSelectionBlockers(provider.requirements, {
            isAuthenticated: !!auth?.session,
            isPro: billing.isPro,
            config: { base_url: baseUrl, api_key: apiKey },
          }).length === 0;

        if (!eligible) {
          return [provider.id, { listModels: undefined }];
        }

        let listModelsFunc: () => Promise<ListModelsResult>;

        switch (provider.id) {
          case "ollama":
            listModelsFunc = () => listOllamaModels(baseUrl, apiKey);
            break;
          default:
            listModelsFunc = () => listGenericModels(baseUrl, apiKey);
        }

        return [provider.id, { listModels: listModelsFunc }];
      }),
    ) as Record<string, ProviderStatus>;
  }, [configuredProviders, auth, billing]);

  return mapping;
}
