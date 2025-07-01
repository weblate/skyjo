"use client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/useAuth"
import { zodResolver } from "@hookform/resolvers/zod"
import { type UpdateName, updateNameSchema } from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { useSettingsApi } from "../useSettingsApi"
import { AvatarSelector } from "./AvatarSelector"

export function ProfileSection() {
  const t = useTranslations("pages.SettingsProfile")
  const { user, refetch } = useAuth()
  const { loading, updateProfile } = useSettingsApi()

  const profileForm = useForm<UpdateName>({
    resolver: zodResolver(updateNameSchema),
    defaultValues: {
      name: user?.name ?? "",
    },
  })

  const handleAvatarChange = async () => await refetch()

  if (!user) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-dark-font">
            {t("fields.avatar.label")}
          </h3>
          <p className="text-sm text-black/60 dark:text-dark-font/60">
            {t("fields.avatar.description")}
          </p>
        </div>
        <AvatarSelector
          currentAvatar={user.avatar}
          onAvatarChange={handleAvatarChange}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-dark-font">
            {t("fields.name.label")}
          </h3>
          <p className="text-sm text-black/60 dark:text-dark-font/60">
            {t("fields.name.description")}
          </p>
        </div>
        <Form {...profileForm}>
          <form
            onSubmit={profileForm.handleSubmit(updateProfile)}
            className="space-y-4"
          >
            <FormField
              control={profileForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t("fields.name.placeholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              loading={loading === "profile"}
              disabled={!profileForm.formState.isDirty}
            >
              {t("fields.name.submit")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
