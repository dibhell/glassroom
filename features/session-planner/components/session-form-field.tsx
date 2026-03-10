import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

interface SessionFormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  helper?: string;
  children: ReactNode;
}

export function SessionFormField({
  label,
  htmlFor,
  error,
  helper,
  children,
}: SessionFormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-rose-300">{error}</p>
      ) : helper ? (
        <p className="text-xs text-emerald-50/55">{helper}</p>
      ) : null}
    </div>
  );
}
