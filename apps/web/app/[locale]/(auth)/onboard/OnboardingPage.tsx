"use client"

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
import { AVATARS_ARRAY, useUser } from "@/contexts/UserContext"
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser"
import { useRouter } from "@/i18n/routing"
import { zodResolver } from "@hookform/resolvers/zod"
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

const OnboardingPage = () => {
  const router = useRouter()
  const t = useTranslations("pages.Onboarding")
  const { getAvatar, avatarIndex } = useUser()
  const { data: authenticatedUser } = useAuthenticatedUser()
  const form = useForm({
    resolver: zodResolver(
      authenticatedUser?.hasOAuth
        ? onboardingSchema
        : onboardingWithPasswordSchema,
    ),
    defaultValues: {
      name: "",
      username: "",
      avatar: getAvatar(),
      password: "",
    },
  })

  const [apiError, setApiError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const watchedUsername = form.watch("username")
  const watchedPassword = form.watch("password")

  const { usernameAvailability } = useUsernameValidation(watchedUsername)

  useEffect(() => {
    if (!authenticatedUser || authenticatedUser?.hasOAuth) {
      setShowPassword(false)
    } else {
      setShowPassword(true)
    }

    if (authenticatedUser) {
      form.setValue("name", authenticatedUser.name ?? "")
      form.setValue("username", authenticatedUser.username ?? "")
      form.setValue("avatar", authenticatedUser.avatar ?? "bee")
    }
  }, [authenticatedUser, form])

  useEffect(() => {
    const currentAvatar = getAvatar()
    if (currentAvatar && currentAvatar !== form.getValues("avatar")) {
      form.setValue("avatar", currentAvatar)
    }
  }, [avatarIndex, form, getAvatar])

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof onboardingSchema>) => {
      setApiError(null)

      const payload = authenticatedUser?.hasOAuth
        ? { name: data.name, username: data.username, avatar: data.avatar }
        : data

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/onboard`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        },
      )

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || "Onboarding failed")
      }

      return res.json()
    },
    onSuccess: () => {
      router.replace("/profile")
    },
    onError: (error) => {
      console.error(error)
      // Don't show username taken error here as it's already shown in username validation
      if (error.message !== "Username is already taken") {
        setApiError(error.message)
      }
    },
  })

  const isFormValid = () => {
    const values = form.getValues()
    const isNameValid = values.name.trim().length >= 1
    const isUsernameValid =
      values.username.length >= 3 && usernameAvailability === true
    const isAvatarValid = !!values.avatar

    // For OAuth users, password is not required
    if (authenticatedUser?.hasOAuth) {
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
          <form
            onSubmit={form.handleSubmit(
              (data) => mutate(data),
              (error) => {
                console.error(error)
              },
            )}
            className="space-y-2"
          >
            <FormField
              control={form.control}
              name="avatar"
              render={() => (
                <FormItem className="space-y-1 flex justify-center">
                  <SelectAvatar
                    value={getAvatarIndexFromName(form.getValues("avatar"))}
                    onChange={(index) =>
                      form.setValue("avatar", getAvatarNameFromIndex(index))
                    }
                    className="size-20"
                    responsive={false}
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
                    />
                    <PasswordRequirements password={watchedPassword} />
                  </FormItem>
                )}
              />
            )}

            {apiError && (
              <div className="text-red-600 text-sm">
                {apiError === "Username is already taken"
                  ? t("form.errors.username-taken")
                  : t("form.errors.default")}
              </div>
            )}

            <div className="w-full pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isPending || !isFormValid()}
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
