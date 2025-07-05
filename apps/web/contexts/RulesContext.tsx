"use client"

import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react"
import RulesDialog from "@/components/RulesDialog"

interface RulesContext {
  openRules: () => void
  isRulesOpen: boolean
}
const RulesContext = createContext<RulesContext | undefined>(undefined)

const RulesProvider = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(false)

  const openRules = () => setOpen(true)

  const onOpenChange = (open: boolean) => {
    setOpen(open)
  }

  const value = useMemo(
    () => ({
      openRules,
      isRulesOpen: open,
    }),
    [],
  )

  return (
    <RulesContext.Provider value={value}>
      {children}
      <RulesDialog open={open} onOpenChange={onOpenChange} />
    </RulesContext.Provider>
  )
}

export const useRules = () => {
  const context = useContext(RulesContext)
  if (context === undefined) {
    throw new Error("useRules must be used within a RulesProvider")
  }
  return context
}

export default RulesProvider
