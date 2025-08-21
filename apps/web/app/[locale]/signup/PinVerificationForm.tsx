"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Locales } from "@skymo/shared/constants"
import type { SendPinError, VerifyPinError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { verifyPinSchema } from "@skymo/shared/validations"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { usePlayer } from "@/contexts/PlayerContext"
import { useSettings } from "@/contexts/SettingsContext"
import { cn } from "@/lib/utils"

type OtpStatus = "success" | "error" | undefined

interface PinVerificationFormProps {
  email: string
  locale: Locales
  onGoBack: () => void
}

export const PinVerificationForm = ({
  email,
  locale,
  onGoBack,
}: PinVerificationFormProps) => {
  const { getPlayer } = usePlayer()
  const { settings } = useSettings()
  const router = useRouter()
  const queryClient = useQueryClient()
  const tVerify = useTranslations("pages.Verify")
  const tErrors = useTranslations("errors")

  const [otpStatus, setOtpStatus] = useState<OtpStatus>(undefined)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Resend cooldown effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prevCooldown) => prevCooldown - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown])

  const form = useForm({
    resolver: zodResolver(verifyPinSchema),
    defaultValues: {
      pin: "",
    },
  })

  const { mutate: verifyPin, isPending: isVerifying } = useMutation({
    mutationFn: async (pin: string) => {
      setOtpStatus(undefined)

      const playerData = getPlayer()
      const payload = {
        email,
        pin,
        locale,
        name: playerData?.name,
        avatar: playerData?.avatar,
        settings,
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/try-verification-email`,
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
        const error = await jsonError<VerifyPinError>(res)
        setOtpStatus("error")
        toast.error(tErrors(error))
        throw error
      }

      const data = await res.json()
      const user = data.user

      setOtpStatus("success")
      toast.success(tVerify("toast.success"))

      // Invalidate auth queries to update user state
      queryClient.invalidateQueries({ queryKey: ["authenticated-user"] })

      // Navigate based on onboarding status
      setTimeout(() => {
        if (user.onboardingCompleted) {
          router.push("/")
        } else {
          router.push("/onboard")
        }
      }, 1500)
    },
    onError: () => {
      setOtpStatus("error")
    },
  })

  const { mutate: resendPin, isPending: isSending } = useMutation({
    mutationFn: async () => {
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
        const error = await jsonError<SendPinError>(res)
        toast.error(tErrors(error))
        return
      }

      toast.success(tVerify("toast.resend-success"))
      setResendCooldown(30) // 30 seconds cooldown
    },
    onError: (error: Error) => {
      console.error(error)
      toast.error(tErrors("send-pin-error"))
    },
  })

  const handleOtpChange = (pin: string) => {
    if (isVerifying) return

    form.setValue("pin", pin, { shouldValidate: true })
    setOtpStatus(undefined)

    form.trigger("pin").then((isValid) => {
      if (isValid) {
        if (form.formState.errors.pin?.message === "min-characters") {
          form.clearErrors("pin")
        }
      }
    })
  }

  const handleOtpComplete = (pinValue: string) => {
    if (verifyPinSchema.safeParse({ pin: pinValue }).success) {
      verifyPin(pinValue)
    } else {
      setOtpStatus("error")
      form.trigger("pin")
    }
  }

  const handleResendPin = () => {
    if (resendCooldown === 0 && !isSending && otpStatus !== "success") {
      form.resetField("pin")
      setOtpStatus(undefined)
      resendPin()
    }
  }

  return (
    <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border p-8 rounded-lg max-w-md mx-auto">
      <div className="flex items-center mb-6 relative h-10">
        <Button
          onClick={onGoBack}
          className="p-1 mr-2 dark:hover:bg-gray-700 text-sm absolute top-0"
          variant="icon"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h2 className="w-full text-2xl text-center font-bold text-gray-900 dark:text-white">
          {tVerify("title")}
        </h2>
      </div>

      <p className="text-center text-muted-foreground mb-2">
        {tVerify("description")}
      </p>
      <p className="text-center text-sm text-muted-foreground mb-6">
        Sent to:{" "}
        <span className="font-medium underline underline-offset-2">
          {email}
        </span>
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => verifyPin(data.pin))}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem className="space-y-2 flex flex-col items-center">
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    value={field.value}
                    onChange={handleOtpChange}
                    disabled={isVerifying}
                    onComplete={handleOtpComplete}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} variant={otpStatus} />
                      <InputOTPSlot index={1} variant={otpStatus} />
                      <InputOTPSlot index={2} variant={otpStatus} />
                      <InputOTPSlot index={3} variant={otpStatus} />
                      <InputOTPSlot index={4} variant={otpStatus} />
                      <InputOTPSlot index={5} variant={otpStatus} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>

      <div className="mt-4 text-center text-sm">
        {resendCooldown > 0 ? (
          tVerify("resend.countdown", { seconds: resendCooldown })
        ) : (
          <>
            {tVerify("resend.prompt")}{" "}
            <button
              type="button"
              className={cn(
                "p-0 h-auto text-sm underline underline-offset-2 enabled:hover:text-primary cursor-pointer disabled:cursor-not-allowed disabled:text-muted-foreground",
              )}
              onClick={handleResendPin}
              disabled={
                isSending || resendCooldown > 0 || otpStatus === "success"
              }
            >
              {isSending ? tVerify("resend.sending") : tVerify("resend.button")}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
