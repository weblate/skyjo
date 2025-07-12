"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Locales } from "@skymo/shared/constants"
import type { LoginError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { LoginUser, loginSchema } from "@skymo/shared/validations"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import GoogleOAuthButton from "@/components/GoogleOAuthButton"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { useSettingsSync } from "@/hooks/useSettingsSync"
import { Link, useRouter } from "@/i18n/routing"

interface LoginPageProps {
  locale: Locales
}
const LoginPage = ({ locale }: LoginPageProps) => {
  const router = useRouter()
  const t = useTranslations("pages.Login")
  const tErrors = useTranslations("errors")
  const { syncSettingsFromServer, settingsSyncState } = useSettingsSync()

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  })

  const [apiError, setApiError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: LoginUser) => {
      setApiError(null)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await jsonError<LoginError>(res)
        setApiError(tErrors(error))
        return
      }

      const result = await res.json()
      return result
    },
    onSuccess: async () => {
      let newLocale = locale
      if (settingsSyncState?.isEnabled) {
        const syncLocale = await syncSettingsFromServer()
        if (syncLocale) newLocale = syncLocale
      }

      router.push("/", { locale: newLocale })
    },
    onError: (error) => {
      console.error(error)
      toast.error(tErrors("login-error"))
    },
  })

  const onSubmit = (data: LoginUser) => {
    mutate(data)
  }

  return (
    <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4">
      <div className="max-w-md flex flex-col w-full -translate-y-12 px-4">
        <h1 className="text-2xl font-medium mb-6 text-center">{t("title")}</h1>

        {apiError && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {apiError}
          </div>
        )}

        <GoogleOAuthButton />

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300" />
          <div className="mx-4 text-sm text-gray-600">Or</div>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="login">{t("form.login.label")}</Label>
                  <Input
                    id="login"
                    type="text"
                    autoComplete="login"
                    disabled={isPending}
                    {...field}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("form.password.label")}</Label>
                    <Link
                      href="/reset-password"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      {t("forgot-password")}
                    </Link>
                  </div>
                  <PasswordInput
                    id="password"
                    autoComplete="password"
                    disabled={isPending}
                    {...field}
                  />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" loading={isPending}>
              {t("form.submit")}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm break-words">
          <span className="text-gray-600">{t("signup.description")} </span>
          <Link href="/signup" className="text-blue-600 hover:text-blue-800">
            {t("signup.link")}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
