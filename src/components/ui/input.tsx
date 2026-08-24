import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "aureus-input flex h-12 w-full min-w-0 rounded-xl border border-border/30 bg-[hsl(var(--home-surface))] px-3.5 py-2.5 text-base text-foreground shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/80 focus-visible:border-ring/55 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
