"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { waitlistSchema } from "@skymo/shared/validations"
import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, Loader2, Mail, Send, User } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "@/i18n/routing"

export const MobileWaitlistForm = () => {
  const t = useTranslations("pages.MobileWaitlist")
  const tErrors = useTranslations("errors")
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: "",
      firstName: undefined,
    },
  })

  const { mutate: submitWaitlist, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof waitlistSchema>) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "waitlist-subscription-failed")
      }

      return true
    },
    onSuccess: () => {
      setIsSuccess(true)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error(tErrors(error.message as any))
    },
  })

  const handleSubmit = (data: z.infer<typeof waitlistSchema>) => {
    submitWaitlist(data)
  }

  if (isSuccess) {
    return (
      <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-lg py-12 px-8 text-center">
        <div className="flex justify-center">
          <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4 mb-2">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="space-y-2 mb-6 ">
          <h3 className="text-2xl font-bold text-black dark:text-dark-font">
            {t("success.title")}
          </h3>
          <p className="text-muted-foreground">{t("success.description")}</p>
        </div>
        <div className="pt-6 border-t border-black/10 dark:border-white/10">
          <p className="text-sm text-muted-foreground mb-4">
            {t("success.discord-cta")}
          </p>
          <div className="flex justify-center mt-2">
            <Link
              href={
                process.env.NEXT_PUBLIC_DISCORD_URL ||
                "https://discord.gg/skymo"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-row items-center gap-2 underline underline-offset-2 text-blue-600"
            >
              <Image
                src="/svg/discord-blue.svg"
                unoptimized
                width={24}
                height={24}
                alt="Discord server invite icon"
              />
              {t("success.discord-button")}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-lg p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("form.firstName.label")}
                </Label>
                <FormControl>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder={t("form.firstName.placeholder")}
                    autoComplete="given-name"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t("form.email.label")}
                </Label>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("form.email.placeholder")}
                    autoComplete="email"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {t("form.submit")}
          </Button>
        </form>
      </Form>
      <p className="text-xs text-muted-foreground text-center mt-4">
        {t("form.privacy-note")}
      </p>
    </div>
  )
}
