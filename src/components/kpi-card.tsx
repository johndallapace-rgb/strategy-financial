import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  subtitle,
  valueClassName,
}: {
  title: string;
  value: string;
  subtitle?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="relative overflow-hidden border bg-card/70 backdrop-blur">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("font-mono text-3xl font-semibold tracking-tight tabular-nums md:text-4xl", valueClassName)}>
          {value}
        </div>
        {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
      </CardContent>
    </Card>
  );
}
