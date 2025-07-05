"use client"

import { Trash2Icon } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSettingsApi } from "../useSettingsApi"

export function DeleteAccount() {
  const t = useTranslations("pages.SettingsAccount.delete-account")
  const { loading, deleteAccount } = useSettingsApi()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmationInput, setConfirmationInput] = useState("")

  const handleDeleteAccount = async () => {
    await deleteAccount()
    setDeleteDialogOpen(false)
    setConfirmationInput("")
  }

  const handleDialogClose = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      setConfirmationInput("")
    }
  }

  const expectedText = t("confirmation.input-placeholder").toUpperCase()
  const isDeleteEnabled =
    confirmationInput.trim().toUpperCase() === expectedText

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-xl text-red-600 dark:text-red-700">
          {t("title")}
        </h4>
        <p className="text-sm text-red-600 dark:text-red-700 mt-1">
          {t("description")}
        </p>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={handleDialogClose}>
        <DialogTrigger asChild>
          <Button color="destructive" shadow={false}>
            <Trash2Icon className="size-4 mr-2" />
            {t("button")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription className="pt-1 text-justify ">
              {t("confirmation.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                {t("confirmation.input-label")}
              </Label>
              <Input
                id="delete-confirmation"
                type="text"
                placeholder={t("confirmation.input-placeholder")}
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              color="white"
              onClick={() => handleDialogClose(false)}
              shadow={false}
            >
              {t("confirmation.cancel-button")}
            </Button>
            <Button
              color="destructive"
              loading={loading === "delete"}
              disabled={!isDeleteEnabled}
              onClick={handleDeleteAccount}
              shadow={false}
            >
              {t("confirmation.delete-button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
