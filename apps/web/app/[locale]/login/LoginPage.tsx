"use client"

import GoogleOAuthButton from "@/components/GoogleOAuthButton"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Link, useRouter } from "@/i18n/routing"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthError } from "@skymo/shared/constants"
import { LoginUser, loginSchema } from "@skymo/shared/validations"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"

const LoginPage = () => {
  const router = useRouter()
  const t = useTranslations("pages.Login")

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  })

  const [apiError, setApiError] = useState<
    "invalid-credentials" | "default" | null
  >(null)

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: LoginUser) => {
      setApiError(null)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      })
      console.log(res)
      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || "Login failed")
      }
    },
    onSuccess: () => router.push("/"),
    onError: (error) => {
      console.error(error)
      if (error.message === AuthError.LOGIN_INVALID_CREDENTIALS) {
        setApiError(AuthError.LOGIN_INVALID_CREDENTIALS)
      } else {
        setApiError("default")
      }
    },
  })

  return (
    <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4 ">
      <div className="max-w-sm flex flex-col w-full -translate-y-12">
        <h1 className="text-2xl text-center font-medium mb-6">{t("title")}</h1>

        <div className="flex flex-col gap-2">
          <GoogleOAuthButton />
        </div>
        <div className="flex flex-row items-center gap-2 mt-6 mb-2">
          <hr className="w-full border border-black dark:border-white" />
          <p className="text-center text-black dark:text-white">Or</p>
          <hr className="w-full border border-black dark:border-white" />
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutate(data))}
            className="space-y-2"
          >
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <Label htmlFor="login">{t("form.login.label")}</Label>
                  <Input
                    id="login"
                    type="text"
                    autoComplete="login"
                    {...field}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <Label htmlFor="password">{t("form.password.label")}</Label>
                  <PasswordInput
                    id="password"
                    autoComplete="password"
                    {...field}
                  />
                </FormItem>
              )}
            />
            {apiError && (
              <div className="text-red-600 text-sm">
                {t(`form.error.${apiError}`)}
              </div>
            )}
            <Link
              href="/reset-password"
              className="text-sm underline underline-offset-2 text-blue-600 dark:text-blue-400"
            >
              {t("forgot-password")}
            </Link>
            <div />
            <Button type="submit" className="w-full" disabled={isPending}>
              {t("form.submit")}
            </Button>
          </form>
        </Form>

        <div className="text-center mt-8 flex flex-row items-center justify-center gap-1">
          <p className="text-sm text-black dark:text-dark-font">
            {t("signup.description")}
          </p>
          <Link
            href="/signup"
            className="text-sm font-medium underline underline-offset-2 text-blue-600 dark:text-blue-400"
          >
            {t("signup.link")}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
