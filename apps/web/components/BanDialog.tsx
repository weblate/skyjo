"use client"

import type { PenaltyData } from "@skymo/shared/types"
import dayjs from "dayjs"
import { useTranslations } from "next-intl"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "./ui/button"

interface BanDialogProps {
  readonly penalty: PenaltyData
}

export function BanDialog({ penalty }: BanDialogProps) {
  const t = useTranslations("components.BanDialog")
  const [dialogOpen, setDialogOpen] = useState(true)
  const isPermanent = penalty.type === "ban" || !penalty.expiresAt

  function handleUnderstand() {
    setDialogOpen(false)
  }

  return (
    <Dialog open={dialogOpen}>
      <DialogContent allowClose={false} className="max-w-md border-2">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("title")}</DialogTitle>
          <DialogDescription className="pt-1 text-base">
            {t("suspensionMessage", { isPermanent: isPermanent.toString() })}
            {!isPermanent && (
              <>
                {" "}
                {t("temporary", {
                  date: dayjs(penalty.expiresAt).format("DD/MM/YYYY HH:mm"),
                })}{" "}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <p className="font-semibold text-black dark:text-dark-font">
          {t("reasonLabel")}{" "}
          <span className="font-normal">
            {penalty.reason || t("defaultReason")}
          </span>
        </p>

        <DialogFooter className="mt-2 justify-center sm:justify-center">
          <Button onClick={handleUnderstand}>{t("understandButton")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
