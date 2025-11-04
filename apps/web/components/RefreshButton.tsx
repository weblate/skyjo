"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RefreshButtonProps {
  children: React.ReactNode
}

export default function RefreshButton({
  children,
}: Readonly<RefreshButtonProps>) {
  const handleRefresh = () => {
    globalThis.location.reload()
  }

  return (
    <Button variant="small" onClick={handleRefresh}>
      <RefreshCw className="h-4 w-4 mr-2" />
      {children}
    </Button>
  )
}
