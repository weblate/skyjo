"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  type UpdatePassword,
  updatePasswordSchema,
} from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import PasswordRequirements from "@/components/PasswordRequirements"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { PasswordInput } from "@/components/ui/password-input"
import { useAuth } from "@/hooks/useAuth"
import { useSettingsApi } from "../useSettingsApi"

export function SettingsPassword() {
  const t = useTranslations("pages.SettingsPassword")
  const { user } = useAuth()
  const { loading, updatePassword } = useSettingsApi()

  const passwordForm = useForm<UpdatePassword>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const handleUpdatePassword = async (data: UpdatePassword) => {
    try {
      await updatePassword(data)
      passwordForm.reset()
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === t("messages.password-incorrect")
      ) {
        passwordForm.setError("currentPassword", {
          message: error.message,
        })
      }
    }
  }

  const newPassword = passwordForm.watch("newPassword")
  const confirmPassword = passwordForm.watch("confirmPassword")

  if (!user) {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-black dark:text-dark-font">
          {t("fields.password.label")}
        </h3>
        <p className="text-sm text-black/60 dark:text-dark-font/60">
          {t("fields.password.description")}
        </p>
      </div>

      <Form {...passwordForm}>
        <form
          onSubmit={passwordForm.handleSubmit(handleUpdatePassword)}
          className="space-y-4"
        >
          <FormField
            control={passwordForm.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.password.current-password")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("fields.password.current-placeholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={passwordForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.password.new-password")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("fields.password.new-placeholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={passwordForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.password.confirm-password")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t("fields.password.confirm-placeholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-4">
            <PasswordRequirements
              password={newPassword}
              confirmPassword={confirmPassword}
            />
          </div>

          <Button
            type="submit"
            loading={loading === "password"}
            disabled={!passwordForm.formState.isDirty}
          >
            {t("fields.password.submit")}
          </Button>
        </form>
      </Form>
    </div>
  )
}
