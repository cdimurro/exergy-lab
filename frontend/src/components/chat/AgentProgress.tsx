"use client";

import { WorkflowProgress, ClassificationInfo } from "@/lib/types";

interface AgentProgressProps {
  progress: WorkflowProgress | null;
  classification: ClassificationInfo | null;
}

const STAGE_LABELS: Record<string, string> = {
  literature_review: "Literature Review",
  material_design: "Material Design",
  simulations: "Computational Analysis",
  lab_protocols: "Lab Protocols",
  tea_report: "Techno-Economic Analysis",
  initializing: "Initializing Workflow",
};

const DOMAIN_LABELS: Record<string, string> = {
  solar_pv: "Solar PV",
  battery: "Battery",
  heat_pump: "Heat Pump",
  electric_vehicle: "Electric Vehicle",
  electrolyzer: "Electrolyzer",
  wind_turbine: "Wind Turbine",
  general: "General Research",
};

export function AgentProgress({ progress, classification }: AgentProgressProps) {
  if (!progress && !classification) {
    return null;
  }

  return (
    <div className="border-t bg-muted/50 p-4">
      <div className="space-y-3">
        {classification && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Domain:</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {DOMAIN_LABELS[classification.domain] || classification.domain}
            </span>
            <span className="text-muted-foreground">
              ({(classification.confidence * 100).toFixed(0)}% confidence)
            </span>
          </div>
        )}

        {progress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">
                {STAGE_LABELS[progress.stage] || progress.stage}
              </span>
              <span className="text-xs text-muted-foreground">
                ({progress.agent})
              </span>
            </div>

            {progress.content && (
              <p className="text-sm text-muted-foreground pl-4">
                {progress.content}
              </p>
            )}

            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
