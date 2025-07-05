"use client"

import { cva, VariantProps } from "class-variance-authority"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import * as React from "react"
import { RefCallBack } from "react-hook-form"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border-2 border-black dark:border-dark-border bg-white dark:bg-dark-input px-3 py-2 text-sm text-black dark:text-dark-font file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-black/50 dark:placeholder:text-dark-font/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 -outline-offset-2 focus-visible:outline-black focus-visible:outline-2 focus-visible:outline-offset-[-6px] dark:focus-visible:outline-dark-border",
  {
    variants: {
      size: {
        small: " h-8 ",
        default: "h-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
)

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type">,
    VariantProps<typeof inputVariants> {}

const PasswordInput = ({
  ref,
  size,
  className,
  ...props
}: PasswordInputProps & {
  ref?: React.RefObject<HTMLInputElement> | RefCallBack
}) => {
  const [showPassword, setShowPassword] = React.useState(false)

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        className={cn(inputVariants({ size }), "pr-10", className)}
        ref={ref}
        {...props}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black transition-all duration-200 hover:scale-110 dark:text-dark-font rounded-xs focus-visible:outline-black dark:focus-visible:outline-dark-border focus-visible:outline-2 focus-visible:outline-offset-1"
      >
        {showPassword ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    </div>
  )
}
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
