"use client"

import { FormDescription, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { client } from "@/lib/rpc"
import { cn } from "@/lib/utils"
import type { CheckUsernameError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { useQuery } from "@tanstack/react-query"
import {
  CheckIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { ControllerRenderProps, FieldPath, FieldValues } from "react-hook-form"
import { toast } from "sonner"

interface UsernameInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName>
  label?: string
  description?: string
  placeholder?: string
}

export const UsernameInput = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  field,
  label,
  description,
  placeholder,
}: UsernameInputProps<TFieldValues, TName>) => {
  const t = useTranslations("components.UsernameInput")
  const watchedUsername = field.value

  const { usernameAvailability, isCheckingUsername, usernameError } =
    useUsernameValidation(watchedUsername)

  const getUsernameValidationIcon = useCallback(() => {
    if (watchedUsername === "" || watchedUsername.length < 3) return null

    if (isCheckingUsername)
      return <LoaderCircleIcon className="size-4 animate-spin text-gray-400" />

    if (usernameError || !usernameAvailability)
      return <XIcon className="size-4 text-red-500" />

    if (usernameAvailability)
      return <CheckIcon className="size-4 text-green-500" />

    return <TriangleAlertIcon className="size-4 text-yellow-500" />
  }, [watchedUsername, isCheckingUsername, usernameError, usernameAvailability])

  const getUsernameValidationMessage = useCallback(() => {
    if (!watchedUsername || watchedUsername.length < 3) return null

    if (isCheckingUsername) return t("availability.checking")

    if (usernameAvailability) return t("availability.available")
    if (usernameAvailability === false) return t("availability.taken")

    return null
  }, [
    watchedUsername,
    isCheckingUsername,
    usernameError,
    usernameAvailability,
    t,
  ])

  return (
    <FormItem>
      {label && <Label htmlFor="username">{label}</Label>}
      {description && <FormDescription>{description}</FormDescription>}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
          @
        </div>
        <Input
          id="username"
          type="text"
          placeholder={placeholder}
          autoComplete="username"
          className="pl-6"
          {...field}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getUsernameValidationIcon()}
        </div>
      </div>
      {watchedUsername && watchedUsername.length >= 3 && (
        <div
          className={cn(
            "text-xs",
            isCheckingUsername
              ? "text-gray-400"
              : usernameAvailability && !usernameError
                ? "text-green-600"
                : "text-red-600",
          )}
        >
          {getUsernameValidationMessage()}
        </div>
      )}
    </FormItem>
  )
}

export const useUsernameValidation = (username: string) => {
  const tErrors = useTranslations("errors")

  const [usernameToCheck, setUsernameToCheck] = useState<string>("")

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) setUsernameToCheck(username)
      else setUsernameToCheck("")
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const {
    data: usernameAvailability,
    isLoading: isCheckingUsername,
    error: usernameError,
  } = useQuery({
    queryKey: ["username-availability", usernameToCheck],
    queryFn: async () => {
      if (!usernameToCheck) return null

      const res = await client.auth["check-username"].$post({
        json: { username: usernameToCheck },
      })

      if (!res.ok) {
        const error = await jsonError<CheckUsernameError>(res)
        toast.error(tErrors(error))
        return false
      }

      const result = await res.json()
      return result.available
    },
    enabled: !!usernameToCheck,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  return {
    usernameAvailability,
    isCheckingUsername,
    usernameError,
  }
}
