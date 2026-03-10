const formatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatSessionDate(value: string) {
  return formatter.format(new Date(value));
}
