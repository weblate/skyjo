import { type ButtonProps, Button as _Button } from "@react-email/components"
// biome-ignore lint/correctness/noUnusedImports: needed when using createElement
import React, { type ReactNode } from "react"

interface CustomButtonProps extends ButtonProps {
  children: ReactNode
  href: string
}

export const Button = ({ children, ...props }: CustomButtonProps) => {
  return (
    <_Button
      className="rounded-lg bg-button inline-flex items-center justify-center text-center border-2 border-solid border-black border-r-[5px] border-b-[5px] no-underline"
      {...props}
    >
      <div className="bg-button text-black px-12 py-2 rounded-md font-medium text-sm">
        {children}
      </div>
    </_Button>
  )
}
