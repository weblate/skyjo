import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

const buttonVariants = cva(
  "relative inline-flex flex-row items-center justify-center gap-1 whitespace-nowrap bg-button dark:bg-dark-button border-2 border-black dark:border-dark-border text-black dark:text-dark-font data-[loading=true]:text-transparent dark:data-[loading=true]:text-transparent font-normal transition-all duration-200 -outline-offset-2 focus-visible:outline focus-visible:outline-black focus-visible:outline-2 focus-visible:outline-offset-[-6px] dark:focus-visible:outline-dark-border disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        small: "rounded border-[1.5px] h-8 px-4 text-sm",
        default: "rounded-md h-10 px-4 py-2",
        icon: "rounded-md h-10 w-10 p-2.5",
      },
      color: {
        primary: "bg-button dark:bg-dark-button",
        white: "bg-white dark:bg-white/90 text-black dark:text-black",
        blue: "bg-blue-600/80 dark:bg-blue-600/80 text-white dark:text-white/90",
        destructive:
          "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white dark:text-black dark:border-0",
      },
      shadow: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "small",
        shadow: true,
        className:
          "shadow-[3px_3px_0px_0px_rgba(0,0,0)] dark:shadow-[3px_3px_0px_0px_rgba(137,137,137)] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0)] dark:active:shadow-[0px_0px_0px_0px_rgba(137,137,137)]",
      },
      {
        variant: "default",
        shadow: true,
        className:
          "shadow-[3px_3px_0px_0px_rgba(0,0,0)] dark:shadow-[3px_3px_0px_0px_rgba(137,137,137)] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0)] dark:active:shadow-[0px_0px_0px_0px_rgba(137,137,137)]",
      },
      {
        variant: "icon",
        shadow: true,
        className:
          "shadow-[2px_2px_0px_0px_rgba(0,0,0)] dark:shadow-[2px_2px_0px_0px_rgba(137,137,137)] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0)] dark:active:shadow-[0px_0px_0px_0px_rgba(137,137,137)]",
      },
    ],
    defaultVariants: {
      variant: "default",
      color: "primary",
      shadow: true,
    },
  },
)

const loadingContainerVariants = cva(
  "absolute inset-0 opacity-100 flex items-center justify-center rounded-md z-50 pointer-events-none",
  {
    variants: {
      color: {
        primary: "bg-button dark:bg-dark-button",
        white: "bg-white dark:bg-dark-button",
        blue: "bg-blue-600/80 dark:bg-blue-600/80",
        destructive: "bg-red-600 dark:bg-red-600",
      },
    },
  },
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  children?: React.ReactNode
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      asChild = false,
      loading = false,
      shadow,
      children,
      color,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, color, shadow, className }))}
        ref={ref}
        disabled={loading || disabled}
        data-loading={loading}
        {...props}
      >
        {loading && (
          <span className={loadingContainerVariants({ color })}>
            <Loader2Icon className="h-5 w-5 animate-spin text-black dark:text-dark-font" />
          </span>
        )}
        {children}
      </Comp>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
