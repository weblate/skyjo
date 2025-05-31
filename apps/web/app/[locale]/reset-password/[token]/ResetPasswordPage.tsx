"use client"

import { PasswordRequirements } from "@/components/PasswordRequirements"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Link } from "@/i18n/routing"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthError } from "@skymo/shared/constants"
import { ResetPassword, resetPasswordSchema } from "@skymo/shared/validations"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

const ResetPasswordPage = () => {
  const params = useParams()
  const token = params.token as string | undefined
  const t = useTranslations("pages.ResetPassword")

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || "",
      password: "",
      confirmPassword: "",
    },
  })

  const [isSuccess, setIsSuccess] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const watchedPassword = form.watch("password")
  const watchedConfirmPassword = form.watch("confirmPassword")

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: ResetPassword) => {
      setApiError(null)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            token,
          }),
          credentials: "include",
        },
      )

      if (!res.ok) {
        const result = await res.json()
        console.log(result)
        throw new Error(result.error || "Request failed")
      }

      return res.json()
    },
    onSuccess: () => {
      setIsSuccess(true)
    },
    onError: (error) => {
      console.error(error)
      setApiError(error.message)
    },
  })

  if (!token) {
    return (
      <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4">
        <div className="max-w-sm flex flex-col w-full text-center -translate-y-12">
          <h1 className="text-2xl font-medium mb-6">{t("error.title")}</h1>
          <p className="text-gray-600 mb-6">{t("error.invalidToken")}</p>
          <Link href="/login">
            <Button className="w-full">{t("back")}</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4">
        <div className="max-w-sm flex flex-col w-full text-center -translate-y-12">
          <h1 className="text-2xl font-medium mb-6">{t("success.title")}</h1>
          <p className="text-gray-600 mb-6">{t("success.message")}</p>
          <Link href="/login">
            <Button className="w-full">{t("success.back")}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4">
      <div className="max-w-sm flex flex-col w-full -translate-y-12">
        <h1 className="text-2xl text-center font-medium">{t("title")}</h1>
        <p className="text-gray-600 text-center mb-3">{t("description")}</p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutate(data))}
            className="space-y-2"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <Label htmlFor="password">{t("form.password.label")}</Label>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <Label htmlFor="confirmPassword">
                    {t("form.confirmPassword.label")}
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    autoComplete="new-password"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <PasswordRequirements
              password={watchedPassword}
              confirmPassword={watchedConfirmPassword}
            />

            {apiError && (
              <div className="text-red-600 text-sm text-center">
                {apiError === AuthError.RESET_TOKEN_INVALID &&
                  t("form.error.invalidToken")}
                {apiError === AuthError.RESET_TOKEN_EXPIRED &&
                  t("form.error.expiredToken")}
                {apiError !== AuthError.RESET_TOKEN_INVALID &&
                  apiError !== AuthError.RESET_TOKEN_EXPIRED &&
                  t("form.error.default")}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? t("form.resetting") : t("form.submit")}
              </Button>
            </div>
          </form>
        </Form>

        <div className="text-center mt-4">
          <Link
            href="/login"
            className="text-sm text-black underline underline-offset-2"
          >
            {t("back")}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
