"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Locales } from "@skymo/shared/constants"
import { SignupError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { sendVerificationEmailSchema } from "@skymo/shared/validations"
import { useMutation } from "@tanstack/react-query"
import { MailIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import GoogleOAuthButton from "@/components/GoogleOAuthButton"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "@/i18n/routing"

interface EmailInputFormProps {
  locale: Locales
  onEmailSent: (email: string) => void
}

export const EmailInputForm = ({
  locale,
  onEmailSent,
}: EmailInputFormProps) => {
  const t = useTranslations("pages.Signup")
  const tErrors = useTranslations("errors")
  const tVerify = useTranslations("pages.Verify")

  const form = useForm({
    resolver: zodResolver(sendVerificationEmailSchema),
    defaultValues: {
      email: "",
      locale,
    },
  })

  const {
    mutate: sendVerificationEmail,
    isPending: isLoading,
    error: apiError,
  } = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/send-verification-email`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, locale }),
        },
      )

      if (!res.ok) {
        const error = await jsonError<SignupError>(res)
        throw new Error(error)
      }

      return email
    },
    onSuccess: (email) => {
      toast.success(tVerify("toast.resend-success"))
      onEmailSent(email)
    },
    onError: (error: Error) => {
      console.error(error)
      toast.error(tErrors(error.message as any))
    },
  })

  const handleSubmit = (data: { email: string; locale: Locales }) => {
    sendVerificationEmail(data.email)
  }

  return (
    <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border p-8 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
        {t("title")}
      </h2>

      <div className="space-y-4">
        <GoogleOAuthButton />
      </div>

      <div className="flex items-center gap-4 my-6">
        <hr className="flex-1 border-gray-300 dark:border-gray-600" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t("or")}</p>
        <hr className="flex-1 border-gray-300 dark:border-gray-600" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="email">{t("form.email.label")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormItem>
            )}
          />
          {apiError && (
            <div className="text-red-600 text-sm">
              {tErrors(apiError.message as any)}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            <MailIcon className="w-4 h-4 mr-2" />
            {t("form.email.button")}
          </Button>
        </form>
      </Form>

      <div className="mt-4 text-xs text-center text-gray-600 dark:text-gray-400">
        {t("terms-acceptance.text")}{" "}
        <Link
          href="/terms-of-service"
          className="text-blue-600 dark:text-blue-400 underline underline-offset-1"
        >
          {t("terms-acceptance.terms-link")}
        </Link>{" "}
        {t("terms-acceptance.and")}{" "}
        <Link
          href="/privacy-policy"
          className="text-blue-600 dark:text-blue-400 underline underline-offset-1"
        >
          {t("terms-acceptance.privacy-link")}
        </Link>
      </div>

      <div className="text-center break-words mt-6">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t("already-have-account.description")}{" "}
          <Link
            href="/login"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-1"
          >
            {t("already-have-account.link")}
          </Link>
        </p>
      </div>
    </div>
  )
}
