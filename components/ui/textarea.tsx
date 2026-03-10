import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm text-white shadow-sm transition-colors placeholder:text-emerald-100/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
