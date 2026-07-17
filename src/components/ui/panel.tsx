import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { panelVariants } from "./panel-variants";

export interface PanelProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof panelVariants> {}

function Panel({ className, tone, ...props }: PanelProps) {
  return (
    <div
      data-slot="panel"
      className={cn(panelVariants({ tone }), className)}
      {...props}
    />
  );
}

export { Panel };
