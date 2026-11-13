import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** A form opened from a page's main button. */
export function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-8 max-w-xl">
      <CardHeader><CardTitle><h2>{title}</h2></CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
