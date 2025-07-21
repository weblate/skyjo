"use client"

import { ChatMessage } from "@skymo/shared/types"
import { Report } from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  report?: { playerId: string; messageId?: string }
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
  const [reportType, setReportType] = useState<Report["type"]>("name")

  const reportName = useMemo(
    () =>
      opponents.flat().find((opponent) => opponent.id === report?.playerId)
        ?.name ?? "",
    [opponents, report],
  )

  const userMessages = useMemo(
    () =>
      messages.filter(
        (message) => "name" in message && message.name === reportName,
      ),
    [messages, reportName],
  )

  const [messageId, setMessageId] = useState<string>(
    report?.messageId ?? userMessages[0]?.id ?? "",
  )
  const [comment, setComment] = useState<string>("")

  useEffect(() => {
    if (report?.messageId) {
      setReportType("message")
      setMessageId(report.messageId)
    } else {
      setReportType("name")
    }
  }, [report])

  const submitNameReport = () => {
    socket?.emit("report", {
      targetId: report?.playerId,
      type: "name",
      comment: comment.trim() || undefined,
    })
  }

  const submitMessageReport = () => {
    socket?.emit("report", {
      targetId: report?.playerId,
      messageId,
      type: "message",
      comment: comment.trim() || undefined,
    })
  }
  const handleSubmit = () => {
    if (!report) return

    if (reportType === "name") {
      submitNameReport()
    } else if (reportType === "message" && messageId) {
      submitMessageReport()
    }

    toast.success(t("toast.report-submitted.title"), {
      description: t("toast.report-submitted.description"),
    })

    onOpenChange(false)
    setComment("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: reportName })}</DialogTitle>
          <DialogDescription>
            {t("description", { name: reportName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col py-2">
          <RadioGroup
            value={reportType}
            onValueChange={(value) => setReportType(value as Report["type"])}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="name" id="name" />
              <Label htmlFor="name">{t("report-name")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="message" id="message" />
              <Label htmlFor="message">{t("report-message")}</Label>
            </div>
          </RadioGroup>

          {reportType === "message" && (
            <div className="flex flex-col gap-2 mt-6">
              <Label htmlFor="message-select">{t("select-message")}</Label>
              <Select
                value={messageId}
                onValueChange={setMessageId}
                disabled={userMessages.length === 0}
              >
                <SelectTrigger id="message-select">
                  {userMessages.length > 0 ? (
                    <SelectValue
                      placeholder={t("select-message-placeholder")}
                    />
                  ) : (
                    <SelectValue placeholder={t("no-messages")} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {userMessages.map(
                    (message) =>
                      "name" in message && (
                        <SelectItem key={message.id} value={message.id}>
                          {message.message}
                        </SelectItem>
                      ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-6">
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
          <Button onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button
            onClick={handleSubmit}
            disabled={reportType === "message" && !messageId}
          >
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReportDialog
