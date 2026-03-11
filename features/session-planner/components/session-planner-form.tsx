"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SessionActionResult, SessionDraft, SessionEnergy } from "@/lib/session-types";

import { SessionFormField } from "./session-form-field";

interface SessionPlannerFormProps {
  onCreateSession: (payload: SessionDraft) => Promise<SessionActionResult>;
}

interface SessionFormValues {
  title: string;
  host: string;
  startsAt: string;
  durationMinutes: number;
  notes: string;
  energy: SessionEnergy;
}

const energyOptions: Array<{ value: SessionEnergy; label: string }> = [
  { value: "focus", label: "Focus" },
  { value: "calm", label: "Calm" },
  { value: "hype", label: "Hype" },
];

const initialValues: SessionFormValues = {
  title: "",
  host: "",
  startsAt: "",
  durationMinutes: 45,
  notes: "",
  energy: "focus",
};

export function SessionPlannerForm({ onCreateSession }: SessionPlannerFormProps) {
  const [submitMessage, setSubmitMessage] = useState<SessionActionResult | null>(null);

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const result = await onCreateSession({
        ...value,
        startsAt: toIsoDate(value.startsAt),
      });

      setSubmitMessage(result);

      if (result.status === "success") {
        form.reset();
      }
    },
  });

  return (
    <Card className="border-emerald-200/20 bg-black/25">
      <CardHeader>
        <CardTitle>New session</CardTitle>
        <CardDescription>Plan a slot and save it in browser storage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                value.trim().length < 3 ? "Title must have at least 3 characters." : undefined,
            }}
          >
            {(field) => (
              <SessionFormField
                htmlFor={field.name}
                label="Title"
                error={readFieldError(field.state.meta.errors)}
              >
                <Input
                  id={field.name}
                  value={field.state.value}
                  placeholder="Afternoon Mix Review"
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </SessionFormField>
            )}
          </form.Field>

          <form.Field
            name="host"
            validators={{
              onChange: ({ value }) =>
                value.trim().length < 2 ? "Host name is required." : undefined,
            }}
          >
            {(field) => (
              <SessionFormField
                htmlFor={field.name}
                label="Host"
                error={readFieldError(field.state.meta.errors)}
              >
                <Input
                  id={field.name}
                  value={field.state.value}
                  placeholder="Host name"
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </SessionFormField>
            )}
          </form.Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.Field
              name="startsAt"
              validators={{
                onChange: ({ value }) => {
                  if (!value) {
                    return "Pick date and time.";
                  }

                  if (new Date(value).getTime() < Date.now()) {
                    return "Choose a future date.";
                  }

                  return undefined;
                },
              }}
            >
              {(field) => (
                <SessionFormField
                  htmlFor={field.name}
                  label="Start time"
                  error={readFieldError(field.state.meta.errors)}
                >
                  <Input
                    id={field.name}
                    type="datetime-local"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                  />
                </SessionFormField>
              )}
            </form.Field>

            <form.Field
              name="durationMinutes"
              validators={{
                onChange: ({ value }) =>
                  value < 15 || value > 240 ? "Allowed range: 15-240 minutes." : undefined,
              }}
            >
              {(field) => (
                <SessionFormField
                  htmlFor={field.name}
                  label="Duration"
                  error={readFieldError(field.state.meta.errors)}
                >
                  <Input
                    id={field.name}
                    type="number"
                    min={15}
                    max={240}
                    step={15}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(Number(event.target.value))}
                    onBlur={field.handleBlur}
                  />
                </SessionFormField>
              )}
            </form.Field>
          </div>

          <form.Field name="energy">
            {(field) => (
              <SessionFormField htmlFor={field.name} label="Energy">
                <div className="flex flex-wrap gap-2">
                  {energyOptions.map((option) => {
                    const selected = field.state.value === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={selected ? "default" : "secondary"}
                        size="sm"
                        onClick={() => field.handleChange(option.value)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </SessionFormField>
            )}
          </form.Field>

          <form.Field
            name="notes"
            validators={{
              onChange: ({ value }) =>
                value.length > 240 ? "Notes limit is 240 characters." : undefined,
            }}
          >
            {(field) => (
              <SessionFormField
                htmlFor={field.name}
                label="Notes"
                helper="Optional context for the session."
                error={readFieldError(field.state.meta.errors)}
              >
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  placeholder="New effects chain test."
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </SessionFormField>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          >
            {([canSubmit, isSubmitting]) => (
              <Button className="w-full" disabled={!canSubmit || isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : "Save session"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        {submitMessage ? (
          <Badge variant={submitMessage.status === "success" ? "default" : "hype"}>
            {submitMessage.message}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

function readFieldError(errors: unknown[] | undefined) {
  if (!errors?.length) {
    return undefined;
  }

  const firstError = errors[0];
  return typeof firstError === "string" ? firstError : undefined;
}

function toIsoDate(value: string) {
  return new Date(value).toISOString();
}
