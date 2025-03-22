"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { feedbackSchema } from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { Dispatch, SetStateAction, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

type FeedbackProps = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const FeedbackForm = ({ setOpen }: FeedbackProps) => {
  const t = useTranslations("components.Feedback")
  const [isPending, startTransition] = useTransition()
  const form = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      email: "",
      message: "",
    },
  })

  const submitAction = async (values: z.infer<typeof feedbackSchema>) => {
    if (!values.message) return

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/feedbacks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      },
    )

    const data = await response.json()

    if (data.success) {
      form.reset()

      setOpen(false)
      toast.success(t("toast.success.title"), {
        description: t("toast.success.description"),
        duration: 8000,
      })
    } else {
      toast.error(t("toast.error.title"), {
        duration: 3000,
      })
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          startTransition(() => submitAction(values)),
        )}
        className="flex flex-col w-full gap-2"
      >
        <Label htmlFor="email">{t("email-input.label")}</Label>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex flex-1">
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("email-input.placeholder")}
                  className={cn(
                    form.formState.errors.email && "focus-visible:ring-red-500",
                  )}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Label htmlFor="message">{t("message-input.label")}</Label>
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="flex flex-1">
              <FormControl>
                <Textarea
                  id="message"
                  required
                  placeholder={t("message-input.placeholder")}
                  className={cn(
                    "flex flex-1",
                    form.formState.errors.message &&
                      "focus-visible:ring-red-500",
                  )}
                  rows={4}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button
          type="submit"
          title={t("button-title")}
          className="w-full md:w-fit self-end"
          loading={isPending}
        >
          {t("button-title")}
        </Button>
      </form>
    </Form>
  )
}

const Feedback = ({ open, setOpen }: FeedbackProps) => {
  const t = useTranslations("components.Feedback")
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription className="mt-2">
              {t("description")}
            </DialogDescription>
          </DialogHeader>
          <FeedbackForm open={open} setOpen={setOpen} />
        </DialogContent>
      </Dialog>
    )
  } else {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{t("title")}</DrawerTitle>
            <DrawerDescription>{t("description")}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 mb-4">
            <FeedbackForm open={open} setOpen={setOpen} />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }
}

export default Feedback
