"use client"

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
import { useGame } from "@/contexts/GameContext"
import { useSocket } from "@/contexts/SocketContext"
import { ChatMessage } from "@skymo/shared/types"
import { Report } from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

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
  const [reportType, setReportType] = useState<Report["type"]>("username")

  const reportUsername = useMemo(
    () =>
      opponents.flat().find((opponent) => opponent.id === report?.playerId)
        ?.name ?? "",
    [opponents, report],
  )

  const userMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          "username" in message && message.username === reportUsername,
      ),
    [messages, reportUsername],
  )

  const [messageId, setMessageId] = useState<string>(
    report?.messageId ?? userMessages[0]?.id ?? "",
  )

  useEffect(() => {
    if (report?.messageId) {
      setReportType("message")
      setMessageId(report.messageId)
    } else {
      setReportType("username")
    }
  }, [report])

  const submitUsernameReport = () => {
    socket?.emit("report", {
      targetId: report?.playerId,
      type: "username",
    })
  }

  const submitMessageReport = () => {
    socket?.emit("report", {
      targetId: report?.playerId,
      messageId,
      type: "message",
    })
  }
  const handleSubmit = () => {
    if (!report) return

    if (reportType === "username") {
      submitUsernameReport()
    } else if (reportType === "message" && messageId) {
      submitMessageReport()
    }

    toast.success(t("toast.report-submitted.title"), {
      description: t("toast.report-submitted.description"),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { username: reportUsername })}</DialogTitle>
          <DialogDescription>
            {t("description", { username: reportUsername })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col py-2">
          <RadioGroup
            value={reportType}
            onValueChange={(value) => setReportType(value as Report["type"])}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="username" id="username" />
              <Label htmlFor="username">{t("report-username")}</Label>
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
                      "username" in message && (
                        <SelectItem key={message.id} value={message.id}>
                          {message.message}
                        </SelectItem>
                      ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
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
