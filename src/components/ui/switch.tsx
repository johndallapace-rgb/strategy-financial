"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Switch({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState(Boolean(defaultChecked))
  const isControlled = typeof checked === "boolean"
  const value = isControlled ? checked : uncontrolled

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      data-state={value ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(e) => {
        props.onClick?.(e)
        if (disabled) return
        const next = !value
        if (!isControlled) setUncontrolled(next)
        onCheckedChange?.(next)
      }}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-input bg-muted/60 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-strategy-neon/20 data-[state=checked]:border-strategy-neon/40",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 translate-x-0.5 rounded-full bg-foreground/80 shadow transition-transform data-[state=checked]:translate-x-[1.125rem] data-[state=checked]:bg-strategy-neon"
        data-state={value ? "checked" : "unchecked"}
      />
    </button>
  )
}

export { Switch }
