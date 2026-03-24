import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Download,
  FolderOpen,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback } from "react";

import {
  commands as localSttCommands,
  type LocalModel,
} from "@hypr/plugin-local-stt";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { cn } from "@hypr/utils";

import { useSttSettings } from "./context";
import { ProviderId, PROVIDERS } from "./shared";

import { HyprProviderRow, StyledStreamdown } from "~/settings/ai/shared";
import * as settings from "~/store/tinybase/store/settings";
import { useListener } from "~/stt/contexts";
import { useLocalModelDownload } from "~/stt/useLocalSttModel";

export function ConfigureProviders() {
  const { accordionValue, setAccordionValue, hyprAccordionRef } =
    useSttSettings();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-serif font-semibold">Configure Providers</h3>
      <Accordion
        type="single"
        collapsible
        className="flex flex-col gap-3"
        value={accordionValue}
        onValueChange={setAccordionValue}
      >
        <CactusProviderCard
          ref={hyprAccordionRef}
          providerId="hyprnote"
          providerName="Cactus"
          icon={<img src="/assets/icon.png" alt="Cactus" className="size-5" />}
          badge={PROVIDERS.find((p) => p.id === "hyprnote")?.badge}
        />
      </Accordion>
    </div>
  );
}

function CactusProviderCard({
  ref,
  providerId,
  providerName,
  icon,
  badge,
}: {
  ref?: React.Ref<HTMLDivElement | null>;
  providerId: ProviderId;
  providerName: string;
  icon: React.ReactNode;
  badge?: string | null;
}) {
  const supportedModels = useQuery({
    queryKey: ["list-supported-models"],
    queryFn: async () => {
      const result = await localSttCommands.listSupportedModels();
      return result.status === "ok" ? result.data : [];
    },
    staleTime: Infinity,
  });

  const cactusModels =
    supportedModels.data?.filter((m) => m.model_type === "cactus") ?? [];

  const providerDef = PROVIDERS.find((p) => p.id === providerId);
  const isConfigured = providerDef?.requirements.length === 0;

  return (
    <AccordionItem
      ref={ref}
      value={providerId}
      className={cn([
        "rounded-xl border-2 bg-neutral-50",
        isConfigured ? "border-solid border-neutral-300" : "border-dashed",
      ])}
    >
      <AccordionTrigger
        className={cn(["gap-2 px-4 capitalize hover:no-underline"])}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          {badge && (
            <span className="rounded-full border border-neutral-300 px-2 text-xs font-light text-neutral-500">
              {badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} />
        <div className="flex flex-col gap-3">
          {cactusModels.length > 0 && (
            <>
              {cactusModels.map((model) => (
                <CactusRow
                  key={model.key as string}
                  model={model.key}
                  displayName={model.display_name}
                />
              ))}
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function CactusRow({
  model,
  displayName,
}: {
  model: LocalModel;
  displayName: string;
}) {
  const handleSelectModel = useSafeSelectModel();
  const { shouldHighlightDownload } = useSttSettings();

  const {
    progress,
    hasError,
    isDownloaded,
    showProgress,
    handleDownload,
    handleCancel,
    handleDelete,
  } = useLocalModelDownload(model, handleSelectModel);

  const handleOpen = () => {
    void localSttCommands.cactusModelsDir().then((result) => {
      if (result.status === "ok") {
        void openerCommands.openPath(result.data, null);
      }
    });
  };

  return (
    <HyprProviderRow>
      <div className="flex-1">
        <span className="text-sm font-medium">{displayName}</span>
      </div>

      <LocalModelAction
        isDownloaded={isDownloaded}
        showProgress={showProgress}
        progress={progress}
        hasError={hasError}
        highlight={shouldHighlightDownload}
        onOpen={handleOpen}
        onDownload={handleDownload}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />
    </HyprProviderRow>
  );
}

function LocalModelAction({
  isDownloaded,
  showProgress,
  progress,
  hasError,
  highlight,
  onOpen,
  onDownload,
  onCancel,
  onDelete,
}: {
  isDownloaded: boolean;
  showProgress: boolean;
  progress: number;
  hasError: boolean;
  highlight: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const showShimmer = highlight && !isDownloaded && !showProgress && !hasError;

  if (isDownloaded) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpen}
          className={cn([
            "h-8.5 rounded-full px-4 text-center font-mono text-xs",
            "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
            "shadow-xs hover:shadow-md",
            "transition-all duration-150",
            "flex items-center justify-center gap-1.5",
          ])}
        >
          <FolderOpen className="size-4" />
          <span>Show in Finder</span>
        </button>
        <button
          onClick={onDelete}
          title="Delete Model"
          className={cn([
            "size-8.5 rounded-full",
            "bg-linear-to-t from-red-200 to-red-100 text-red-600",
            "shadow-xs hover:from-red-300 hover:to-red-200 hover:shadow-md",
            "transition-all duration-150",
            "flex items-center justify-center",
          ])}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }

  if (hasError) {
    return (
      <button
        onClick={onDownload}
        className={cn([
          "h-8.5 w-fit rounded-full px-4 text-center font-mono text-xs",
          "bg-linear-to-t from-red-600 to-red-500 text-white",
          "shadow-md hover:scale-[102%] hover:shadow-lg active:scale-[98%]",
          "transition-all duration-150",
          "flex items-center justify-center gap-1.5",
        ])}
      >
        <AlertCircle className="size-4" />
        <span>Retry</span>
      </button>
    );
  }

  if (showProgress) {
    return (
      <button
        onClick={onCancel}
        className={cn([
          "group relative overflow-hidden",
          "h-8.5 w-27.5 rounded-full px-4 text-center font-mono text-xs",
          "bg-linear-to-t from-neutral-300 to-neutral-200 text-neutral-900",
          "shadow-xs",
          "transition-all duration-150",
        ])}
      >
        <div
          className="absolute inset-0 rounded-full bg-neutral-400/50 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div className="relative z-10 flex items-center justify-center gap-1.5 group-hover:hidden">
          <Loader2 className="size-4 animate-spin" />
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="relative z-10 hidden items-center justify-center gap-1.5 group-hover:flex">
          <X className="size-4" />
          <span>Cancel</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onDownload}
      className={cn([
        "relative h-8.5 w-fit overflow-hidden",
        "rounded-full px-4 text-center font-mono text-xs",
        "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
        "shadow-xs hover:scale-[102%] hover:shadow-md active:scale-[98%]",
        "transition-all duration-150",
        "flex items-center justify-center gap-1.5",
      ])}
    >
      {showShimmer && (
        <div
          className={cn([
            "absolute inset-0 -translate-x-full",
            "bg-linear-to-r from-transparent via-neutral-400/30 to-transparent",
            "animate-shimmer",
          ])}
        />
      )}
      <Download className="relative z-10 size-4" />
      <span className="relative z-10">Download</span>
    </button>
  );
}

function ProviderContext({ providerId }: { providerId: ProviderId }) {
  const content =
    providerId === "hyprnote"
      ? "Cactus provides on-device speech-to-text models that run 100% locally on your machine."
      : "";

  if (!content.trim()) {
    return null;
  }

  return <StyledStreamdown className="mb-3">{content.trim()}</StyledStreamdown>;
}

function useSafeSelectModel() {
  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    (model: LocalModel) => model,
    [],
    settings.STORE_ID,
  );

  const active = useListener((state) => state.live.status !== "inactive");

  const handler = useCallback(
    (model: LocalModel) => {
      if (active) {
        return;
      }
      handleSelectModel(model);
    },
    [active, handleSelectModel],
  );

  return handler;
}
