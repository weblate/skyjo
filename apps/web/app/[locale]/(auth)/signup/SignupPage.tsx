"use client"
import GoogleOAuthButton from "@/components/GoogleOAuthButton"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useRouter } from "@/i18n/routing"
import { client } from "@/lib/rpc"
import { zodResolver } from "@hookform/resolvers/zod"
import { Locales } from "@skymo/shared/constants"
import { SignupError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { useMutation } from "@tanstack/react-query"
import { MailIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

type SignupParams = {
  locale: Locales
}
const SignupPage = () => {
  const { locale } = useParams<SignupParams>()
  const router = useRouter()
  const t = useTranslations("pages.Signup")
  const tErrors = useTranslations("errors")

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
      const payload = {
        email: data.email,
        locale,
      }
      const res = await client.auth.signup.$post({
        json: payload,
      })

      if (!res.ok) {
        const error = await jsonError<SignupError>(res)
        setApiError(error)
        return
      }
    },
    onSuccess: () => router.replace("/verify"),
    onError: (error) => {
      console.error(error)
      setApiError("signup-error")
    },
  })

  return (
    <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4">
      <div className="px-4 max-w-sm flex flex-col w-full -translate-y-12">
        <h1 className="text-2xl text-center font-medium mb-6 text-black dark:text-dark-font">
          {t("title")}
        </h1>

        <div className="flex flex-col gap-2">
          <GoogleOAuthButton />
        </div>
        <div className="flex flex-row items-center gap-2 mt-6 mb-2">
          <hr className="w-full border border-black dark:border-dark-font" />
          <p className="text-center text-black dark:text-dark-font">
            {t("or")}
          </p>
          <hr className="w-full border border-black dark:border-dark-font" />
        </div>
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
        <div className="text-sm text-center mt-8 flex flex-col sm:flex-row sm:items-center justify-center gap-1">
          <p className="text-black dark:text-dark-font">
            {t("already-have-account.description")}
          </p>
          <Link
            href="/login"
            className="ml-1 text-blue-600 dark:text-blue-400 underline underline-offset-1"
          >
            {t("already-have-account.link")}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
