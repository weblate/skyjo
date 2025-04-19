"use client"

import { Button } from "@/components/ui/button"
import { useRules } from "@/contexts/RulesContext"

interface RulesButtonProps {
  text: string
}

const RulesButton = ({ text }: RulesButtonProps) => {
  const { openRules } = useRules()

  return (
    <Button onClick={openRules} className="mt-8">
      {text}
    </Button>
  )
}

export { RulesButton }
