"use client"

import * as ToastPrimitives from "@radix-ui/react-toast"
import * as React from "react"

import { cn } from "@/lib/utils"

const ToastAction = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border-[1.5px] border-black dark:border-dark-border bg-button dark:bg-dark-button text-black dark:text-dark-font transition-all duration-200 focus-visible:outline-black focus-visible:-outline-offset-4 px-3 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0)] active:translate-x-0.5  active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0)]",
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

type ToastActionElement = React.ReactElement<typeof ToastAction>

export { ToastAction, type ToastActionElement }
