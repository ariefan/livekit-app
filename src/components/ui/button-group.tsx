"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function ButtonGroup({ className, children, ...props }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex -space-x-px rounded-lg shadow-sm rtl:space-x-reverse",
        "[&>*:first-child]:rounded-l-lg [&>*:first-child]:rounded-r-none",
        "[&>*:last-child]:rounded-r-lg [&>*:last-child]:rounded-l-none",
        "[&>*:not(:first-child):not(:last-child)]:rounded-none",
        "[&>*:focus]:z-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { ButtonGroup }
