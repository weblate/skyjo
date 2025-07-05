"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { OTPInput, OTPInputContext } from "input-otp"
import { Dot } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName,
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
))
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const slotVariants = cva(
  [
    "relative flex h-10 w-10 items-center justify-center text-sm transition-all duration-200",
    "bg-white dark:bg-dark-input text-black dark:text-dark-font",
    "border-t-2 border-b-2 border-l first:border-l-2 border-r last:border-r-2 first:rounded-l-md last:rounded-r-md",
  ],
  {
    variants: {
      variant: {
        default: "border-black dark:border-dark-border",
        success: "border-green-500 dark:border-green-600",
        error: "border-red-500 dark:border-red-600",
      },
      isActive: {
        true: "z-10 outline outline-2 outline-offset-[-6px]",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        isActive: true,
        className: "outline-black dark:outline-dark-border",
      },
      {
        variant: "success",
        isActive: true,
        className: "outline-green-500 dark:outline-green-600",
      },
      {
        variant: "error",
        isActive: true,
        className: "outline-red-500 dark:outline-red-600",
      },
    ],
    defaultVariants: {
      variant: "default",
    },
  },
)

interface InputOTPSlotProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof slotVariants> {
  index: number
}

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  InputOTPSlotProps
>(({ index, className, variant, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    <div
      ref={ref}
      className={cn(slotVariants({ variant, isActive }), className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-slate-950 duration-1000 dark:bg-slate-50" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Dot />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
