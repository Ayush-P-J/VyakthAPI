const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string | null | undefined, never = "Never") => (iso ? dateTime.format(new Date(iso)) : never);
