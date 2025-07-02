import { cn } from "@/lib/utils"

interface SeparatorProps {
  className?: string
  orientation?: "horizontal" | "vertical"
}

export function Separator({
  className,
  orientation = "horizontal",
}: Readonly<SeparatorProps>) {
  return (
    <div
      className={cn(
        "bg-black dark:bg-dark-border",
        orientation === "horizontal" ? "h-0.5 w-full" : "w-0.5 h-full",
        className,
      )}
    />
  )
}
