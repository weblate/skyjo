"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { OnboardingError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import {
  onboardingSchema,
  onboardingWithPasswordSchema,
  passwordSchema,
} from "@skymo/shared/validations"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { PasswordRequirements } from "@/components/PasswordRequirements"
import SelectAvatar from "@/components/SelectAvatar"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import {
  UsernameInput,
  useUsernameValidation,
} from "@/components/ui/username-input"
import { AVATARS_ARRAY, usePlayer } from "@/contexts/PlayerContext"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "@/i18n/routing"

const OnboardingPage = () => {
  const router = useRouter()
  const t = useTranslations("pages.Onboarding")
  const tErrors = useTranslations("errors")
  const { getAvatar, avatarIndex } = usePlayer()
  const { user, refetch } = useAuth()
  const form = useForm({
    resolver: zodResolver(
      user?.hasOAuth ? onboardingSchema : onboardingWithPasswordSchema,
    ),
    defaultValues: {
      name: "",
      username: "",
      avatar: getAvatar(),
      password: "",
    },
  })

  const [apiError, setApiError] = useState<OnboardingError | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const watchedUsername = form.watch("username")
  const watchedPassword = form.watch("password")

  const { usernameAvailability } = useUsernameValidation(watchedUsername)

  useEffect(() => {
    if (!user || user?.hasOAuth) {
      setShowPassword(false)
    } else {
      setShowPassword(true)
    }

    if (user) {
      form.setValue("name", user.name ?? "")
      form.setValue("username", user.username ?? "")
      form.setValue("avatar", user.avatar ?? "bee")
    }
  }, [user, form])

  useEffect(() => {
    const currentAvatar = getAvatar()
    if (currentAvatar && currentAvatar !== form.getValues("avatar")) {
      form.setValue("avatar", currentAvatar)
    }
  }, [avatarIndex, form, getAvatar])

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof onboardingSchema>) => {
      setApiError(null)

      const payload = user?.hasOAuth
        ? { name: data.name, username: data.username, avatar: data.avatar }
        : data

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/onboard`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        const error = await jsonError<OnboardingError>(res)
        setApiError(error)
        return
      }

      return res.json()
    },
    onSuccess: () => {
      refetch()
      router.replace("/")
    },
    onError: (error) => {
      console.error(error)
      setApiError("onboarding-error")
    },
  })

  const isFormValid = () => {
    const values = form.getValues()
    const isNameValid = values.name.trim().length >= 1
    const isUsernameValid =
      values.username.length >= 3 && usernameAvailability === true
    const isAvatarValid = !!values.avatar

    // For OAuth users, password is not required
    if (user?.hasOAuth) {
      return isNameValid && isUsernameValid && isAvatarValid
    }

    // For non-OAuth users, password is required and must meet requirements
    const isPasswordValid = passwordSchema.safeParse(values.password).success

    return isNameValid && isUsernameValid && isAvatarValid && isPasswordValid
  }

  // Helper functions to convert between avatar name and index
  const getAvatarIndexFromName = (avatarName: string) => {
    return AVATARS_ARRAY.findIndex((avatar) => avatar === avatarName)
  }

  const getAvatarNameFromIndex = (index: number) => {
    return AVATARS_ARRAY[index]
  }

  const onSubmit = (data: z.infer<typeof onboardingSchema>) => {
    mutate(data)
  }

  return (
    <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4 py-10">
      <div className="px-4 max-w-sm flex flex-col w-full">
        <h1 className="text-2xl text-center font-medium mb-2 text-black dark:text-dark-font">
          {t("title")}
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          {t("subtitle")}
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem className="space-y-1 flex justify-center">
                  <SelectAvatar
                    value={getAvatarIndexFromName(field.value)}
                    onChange={(index) => {
                      field.onChange(getAvatarNameFromIndex(index))
                    }}
                    disabled={isPending}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="name">{t("form.name.label")}</Label>
                  <FormDescription>
                    {t("form.name.description")}
                  </FormDescription>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("form.name.placeholder")}
                    autoComplete="name"
                    {...field}
                    disabled={isPending}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <UsernameInput
                  field={field}
                  label={t("form.username.label")}
                  description={t("form.username.description")}
                  placeholder={t("form.username.placeholder")}
                />
              )}
            />

            {showPassword && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <Label htmlFor="password">{t("form.password.label")}</Label>
                    <PasswordInput
                      id="password"
                      placeholder={t("form.password.placeholder")}
                      autoComplete="new-password"
                      {...field}
                      disabled={isPending}
                    />
                    <PasswordRequirements password={watchedPassword} />
                  </FormItem>
                )}
              />
            )}

            {apiError && (
              <div className="text-red-600 text-sm">{tErrors(apiError)}</div>
            )}

            <div className="w-full pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={!isFormValid() || isPending}
                loading={isPending}
              >
                {t("form.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default OnboardingPage
