"use client"

import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "@/i18n/routing"
import { client } from "@/lib/rpc"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ForgotPasswordError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { ForgotPassword, forgotPasswordSchema } from "@skymo/shared/validations"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"

const ResetPasswordFormPage = () => {
  const t = useTranslations("pages.ForgotPassword")
  const tErrors = useTranslations("errors")

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const [isSuccess, setIsSuccess] = useState(false)
  const [apiError, setApiError] = useState<ForgotPasswordError | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: ForgotPassword) => {
      setApiError(null)
      const res = await client.auth["forgot-password"].$post({
        json: payload,
      })

      if (!res.ok) {
        const error = await jsonError<ForgotPasswordError>(res)
        setApiError(error)
        return
      }

      return res.json()
    },
    onSuccess: () => {
      setIsSuccess(true)
    },
    onError: (error) => {
      console.error(error)
      setApiError("forgot-password-error")
    },
  })

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
        <h1 className="text-2xl text-center font-medium mb-3">{t("title")}</h1>
        <p className="text-gray-600 text-center mb-3">{t("description")}</p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutate(data))}
            className="space-y-2"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <Label htmlFor="email">{t("form.email.label")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {apiError && (
              <div className="text-red-600 text-sm text-center">
                {tErrors(apiError)}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("form.sending") : t("form.submit")}
            </Button>
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

export default ResetPasswordFormPage
