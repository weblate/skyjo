"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { Locales } from "@skymo/shared/constants"
import { SignupError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { useMutation } from "@tanstack/react-query"
import { MailIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import GoogleOAuthButton from "@/components/GoogleOAuthButton"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePlayer } from "@/contexts/PlayerContext"
import { useAuth } from "@/hooks/useAuth"
import { Link, useRouter } from "@/i18n/routing"

type SignupParams = {
  locale: Locales
}

const SignupForm = () => {
  const { locale } = useParams<SignupParams>()
  const _router = useRouter()
  const t = useTranslations("pages.Signup")
  const tErrors = useTranslations("errors")
  const { getPlayer } = usePlayer()
  const { refetch } = useAuth()

  const form = useForm({
    resolver: zodResolver(
      z.object({ email: z.string().email("invalid-email") }),
    ),
    defaultValues: {
      email: "",
    },
  })

  const [apiError, setApiError] = useState<SignupError | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: { email: string }) => {
      setApiError(null)

      const playerData = getPlayer()
      const payload = {
        email: data.email,
        locale,
        ...playerData,
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/signup`,
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
        const error = await jsonError<SignupError>(res)
        setApiError(error)
      }

      await refetch()
    },
    onError: (error) => {
      console.error(error)
      setApiError("signup-error")
    },
  })

  return (
    <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border p-8 rounded-lg shadow-lg lg:shadow-none">
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
        <form
          onSubmit={form.handleSubmit((data) => mutate(data))}
          className="space-y-4"
        >
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
            <div className="text-red-600 text-sm">{tErrors(apiError)}</div>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
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

export default SignupForm
