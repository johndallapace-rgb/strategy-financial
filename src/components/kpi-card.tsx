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
    <Card className="fade-in-up relative overflow-hidden border bg-card/70 backdrop-blur transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-black/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div
          className={cn(
            "font-mono text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums md:text-[34px]",
            valueClassName
          )}
        >
          {value}
        </div>
        {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
      </CardContent>
    </Card>
  );
}
