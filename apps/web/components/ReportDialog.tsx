"use client"

import { ChatMessage } from "@skymo/shared/types"
import { Report, reportReasons } from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useGame } from "@/contexts/GameContext"
import { useSocket } from "@/contexts/SocketContext"

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report?: { playerId: string }
  messages: ChatMessage[]
}
const ReportDialog = ({
  open,
  report,
  messages,
  onOpenChange,
}: ReportDialogProps) => {
  const { socket } = useSocket()
  const { opponents } = useGame()
  const t = useTranslations("components.ReportDialog")
  const [reason, setReason] = useState<Report["reason"]>(
    "inappropriate-username",
  )
  const [comment, setComment] = useState<string>("")

  const reportName = useMemo(
    () =>
      opponents.flat().find((opponent) => opponent.id === report?.playerId)
        ?.name ?? "",
    [opponents, report],
  )

  const handleSubmit = () => {
    if (!report || !reason) return

    socket?.emit("report", {
      targetId: report.playerId,
      reason,
      comment: comment.trim() || undefined,
    })

    toast.success(t("toast.report-submitted.title"), {
      description: t("toast.report-submitted.description"),
    })

    onOpenChange(false)
    setComment("")
    setReason("inappropriate-username")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title", { name: reportName })}</DialogTitle>
          <DialogDescription>
            {t("description", { name: reportName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col py-2">
          {/* Disclaimer */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">{t("disclaimer")}</p>
          </div>

          {/* Reason Selection */}
          <div className="flex flex-col gap-2 mb-6">
            <Label htmlFor="reason-select">{t("reason-label")}</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as Report["reason"])}
            >
              <SelectTrigger id="reason-select">
                <SelectValue placeholder={t("reason-placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reasonOption) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {t(`reasons.${reasonOption}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="comment">{t("comment")}</Label>
            <Textarea
              id="comment"
              placeholder={t("comment-placeholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={3}
            />
            <div className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            color="white"
            shadow={false}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!reason}>
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReportDialog
