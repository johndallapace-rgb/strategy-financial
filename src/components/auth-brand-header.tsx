import Image from "next/image";
import { cn } from "@/lib/utils";

export function AuthBrandHeader({
  className,
  iconSize = 44,
}: {
  className?: string;
  iconSize?: number;
}) {
  return (
    <div className={cn("flex justify-center", className)}>
      <div className="flex items-center gap-3">
        <div className="grid place-items-center">
          <Image
            src="/brand/icon-512.png"
            alt="STRATEGY FINANCIAL"
            width={iconSize}
            height={iconSize}
            priority
            className="select-none object-contain opacity-95"
          />
        </div>
        <div className="flex flex-col justify-center leading-none mt-0.5">
          <div className="text-[17px] font-bold tracking-[0.15em] text-foreground">STRATEGY</div>
          <div className="mt-1 text-[11px] font-semibold tracking-[0.45em] text-primary/60">FINANCIAL</div>
        </div>
      </div>
    </div>
  );
}

