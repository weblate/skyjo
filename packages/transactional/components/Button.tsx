import { type ButtonProps, Button as _Button } from "@react-email/components"
// biome-ignore lint/correctness/noUnusedImports: needed when using createElement
import React, { type ReactNode } from "react"

interface CustomButtonProps extends ButtonProps {
  children: ReactNode
  href: string
}

const Button = ({ children, ...props }: CustomButtonProps) => {
  return (
    <_Button
      className="rounded-md bg-button px-12 py-2 inline-flex items-center justify-center text-center font-medium text-[12px] text-black border-2 border-solid border-black border-r-[5px] border-b-[5px] no-underline"
      {...props}
    >
      {children}
    </_Button>
  )
}

export default Button
