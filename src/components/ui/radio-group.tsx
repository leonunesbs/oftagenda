import * as React from "react"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-2", className)} {...props} />
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="radio"
      className={cn(
        "size-4 rounded-full border border-input bg-input/20 text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { RadioGroup, RadioGroupItem }
