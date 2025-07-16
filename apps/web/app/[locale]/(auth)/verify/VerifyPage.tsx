"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { SendPinError, VerifyPinError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { VerifyPin, verifyPinSchema } from "@skymo/shared/validations"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const COOLDOWN_SECONDS = 30

type OtpStatus = "success" | "error" | undefined

const VerifyPage = () => {
  const router = useRouter()
  const { user, refetch } = useAuth()
  const queryClient = useQueryClient()
  const t = useTranslations("pages.Verify")
  const tErrors = useTranslations("errors")

  const form = useForm({
    resolver: zodResolver(verifyPinSchema),
    defaultValues: {
      pin: "",
    },
  })

  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpStatus, setOtpStatus] = useState<OtpStatus>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const hasInitialPinBeenSent = useRef(false)

  const {
    mutate: verifyPin,
    isPending: isVerifyingPin,
    reset: resetVerifyPin,
  } = useMutation({
    mutationFn: async (payload: VerifyPin) => {
      setOtpStatus(undefined)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/verification/try-pin`,
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
        toast.error(tErrors(error))
      }

      setOtpStatus("success")
      toast.success(t("toast.success"))

      // Refetch will redirect to onboarding page
      setTimeout(async () => {
        queryClient.invalidateQueries({ queryKey: ["authenticated-user"] })
        await refetch()
      }, 1500)
    },
    onError: (error: Error) => {
      console.log(error)
      toast.error(tErrors("verify-pin-error"))
    },
  })

  const { mutate: sendPin, isPending: isSendingPin } = useMutation({
    mutationFn: async () => {
      setOtpStatus(undefined)
      form.resetField("pin")
      resetVerifyPin()

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/verification/send-pin`,
        {
          method: "GET",
          credentials: "include",
        },
      )

      if (!res.ok) {
        const error = await jsonError<SendPinError>(res)

        if (error === "email-already-sent") {
          toast.info(t("toast.email-already-sent"))
          return
        }

        toast.error(tErrors(error))
        return
      }

      toast.success(t("toast.resend-success"))
      setResendCooldown(COOLDOWN_SECONDS)
    },
    onError: (error: Error) => {
      console.log(error)
      toast.error(tErrors("send-pin-error"))
    },
  })

  useEffect(() => {
    if (!user) return

    if (user?.emailVerified && !user.onboardingCompleted) {
      router.replace("/onboard")
      return
    } else if (user?.emailVerified && user.onboardingCompleted) {
      router.replace("/")
      return
    }

    // Only send pin if we haven't sent it already
    if (!hasInitialPinBeenSent.current) {
      hasInitialPinBeenSent.current = true
      sendPin()
    }

    setIsLoading(false)
  }, [user, router])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prevCooldown) => prevCooldown - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown])

  const verifyPinMutate = (data: VerifyPin) => {
    if (isVerifyingPin || otpStatus === "success") return
    verifyPin(data)
  }

  const handleResendPin = () => {
    if (resendCooldown === 0 && !isSendingPin && otpStatus !== "success") {
      sendPin()
    }
  }

  const handleOtpChange = (pin: string) => {
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

  if (isLoading) {
    return (
      <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4 p-4">
        <div className="text-center">
          <div className="inline-block size-6 animate-spin rounded-full border-[3px] border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-lg font-medium">{t("loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4 p-4">
      <div className="max-w-sm flex flex-col w-full">
        <h1 className="text-2xl text-center font-medium mb-2">{t("title")}</h1>
        <p className="text-center text-muted-foreground mb-2">
          {t("description")}
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(verifyPinMutate)}
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
                      disabled={isVerifyingPin ?? otpStatus === "success"}
                      onComplete={(pinValue) => {
                        if (
                          verifyPinSchema.safeParse({ pin: pinValue }).success
                        ) {
                          verifyPinMutate({ pin: pinValue })
                        } else {
                          form.trigger("pin")
                          if (otpStatus !== "error") {
                            setOtpStatus("error")
                          }
                        }
                      }}
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
            t("resend.countdown", { seconds: resendCooldown })
          ) : (
            <>
              {t("resend.prompt")}{" "}
              <button
                type="button"
                className={cn(
                  "p-0 h-auto text-sm underline underline-offset-1",
                  isSendingPin || resendCooldown > 0 || otpStatus === "success"
                    ? "cursor-not-allowed text-muted-foreground"
                    : "hover:text-primary",
                )}
                onClick={handleResendPin}
                disabled={
                  isSendingPin || resendCooldown > 0 || otpStatus === "success"
                }
              >
                {isSendingPin ? t("resend.sending") : t("resend.button")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyPage
