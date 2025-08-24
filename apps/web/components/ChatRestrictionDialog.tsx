"use client"

import type { PenaltyData } from "@skymo/shared/types"
import dayjs from "dayjs"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePenalty } from "@/contexts/PenaltyContext"

interface ChatRestrictionDialogProps {
  penalty: PenaltyData
}

export function ChatRestrictionDialog({ penalty }: ChatRestrictionDialogProps) {
  const t = useTranslations("components.ChatRestrictionDialog")
  const { acknowledgePenalty } = usePenalty()
  const [open, setOpen] = useState(true)

  const handleAcknowledge = async () => {
    await acknowledgePenalty(penalty.id)
    setOpen(false)
  }

  return (
    <Dialog open={open}>
      <DialogContent allowClose={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{t("title")}</DialogTitle>
          <DialogDescription className="pt-2 text-center">
            {penalty.expiresAt
              ? t("detailedDescription")
              : t("detailedDescriptionPermanent")}
          </DialogDescription>
        </DialogHeader>

        {penalty.expiresAt && (
          <p className="text-center text-black dark:text-dark-font mb-2">
            {dayjs(penalty.expiresAt).format("DD/MM/YYYY HH:mm")}
          </p>
        )}

        <DialogFooter className="justify-center sm:justify-center">
          <Button onClick={handleAcknowledge}>{t("acknowledgeButton")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
