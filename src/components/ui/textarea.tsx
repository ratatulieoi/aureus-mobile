import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "aureus-textarea flex min-h-[96px] w-full min-w-0 rounded-xl border border-border/30 bg-[hsl(var(--home-surface))] px-3.5 py-3 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground/80 focus-visible:border-ring/55 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
