"use client"

import { FlagIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGame } from "@/contexts/GameContext"

interface ForfeitConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ForfeitConfirmDialog = ({
  open,
  onOpenChange,
}: ForfeitConfirmDialogProps) => {
  const t = useTranslations("components.ForfeitConfirmDialog")
  const { actions } = useGame()

  const handleConfirm = () => {
    actions.forfeit()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlagIcon className="size-5 text-orange-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="pt-2">{t("message")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            color="white"
            onClick={() => onOpenChange(false)}
            shadow={false}
          >
            {t("cancel")}
          </Button>
          <Button color="destructive" onClick={handleConfirm}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ForfeitConfirmDialog
