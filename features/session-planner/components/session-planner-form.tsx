"use client";

import { useRouter } from "next/navigation";
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
  createSessionAction: (payload: SessionDraft) => Promise<SessionActionResult>;
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

export function SessionPlannerForm({ createSessionAction }: SessionPlannerFormProps) {
  const router = useRouter();
  const [submitMessage, setSubmitMessage] = useState<SessionActionResult | null>(null);

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const result = await createSessionAction({
        ...value,
        startsAt: toIsoDate(value.startsAt),
      });

      setSubmitMessage(result);

      if (result.status === "success") {
        form.reset();
        router.refresh();
      }
    },
  });

  return (
    <Card className="border-emerald-200/20 bg-black/25">
      <CardHeader>
        <CardTitle>Nowa sesja</CardTitle>
        <CardDescription>
          Zaplanuj slot i zapisz go server action w architekturze RSC.
        </CardDescription>
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
                value.trim().length < 3 ? "Tytuł musi mieć min. 3 znaki." : undefined,
            }}
          >
            {(field) => (
              <SessionFormField
                htmlFor={field.name}
                label="Tytuł"
                error={readFieldError(field.state.meta.errors)}
              >
                <Input
                  id={field.name}
                  value={field.state.value}
                  placeholder="Np. Afternoon Mix Review"
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
                value.trim().length < 2 ? "Podaj prowadzącego." : undefined,
            }}
          >
            {(field) => (
              <SessionFormField
                htmlFor={field.name}
                label="Prowadzący"
                error={readFieldError(field.state.meta.errors)}
              >
                <Input
                  id={field.name}
                  value={field.state.value}
                  placeholder="Imię prowadzącego"
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
                    return "Wybierz datę i godzinę.";
                  }

                  if (new Date(value).getTime() < Date.now()) {
                    return "Wybierz przyszły termin.";
                  }

                  return undefined;
                },
              }}
            >
              {(field) => (
                <SessionFormField
                  htmlFor={field.name}
                  label="Start"
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
                  value < 15 || value > 240 ? "Dozwolone: 15-240 minut." : undefined,
              }}
            >
              {(field) => (
                <SessionFormField
                  htmlFor={field.name}
                  label="Czas trwania"
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
              <SessionFormField htmlFor={field.name} label="Energia">
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
                value.length > 240 ? "Limit notatek to 240 znaków." : undefined,
            }}
          >
            {(field) => (
              <SessionFormField
                htmlFor={field.name}
                label="Notatki"
                helper="Opcjonalnie: kontekst sesji i cele."
                error={readFieldError(field.state.meta.errors)}
              >
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  placeholder="Np. Test nowego chaina efektów."
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
                {isSubmitting ? "Zapisywanie..." : "Zapisz sesję"}
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
