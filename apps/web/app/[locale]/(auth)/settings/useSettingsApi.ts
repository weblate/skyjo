import { useAuth } from "@/hooks/useAuth"
import type {
  DeleteAccountError,
  UpdateEmailError,
  UpdateNameError,
  UpdatePasswordError,
  UpdateUsernameError,
} from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import type {
  UpdateEmail,
  UpdateName,
  UpdatePassword,
  UpdateUsername,
} from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

export function useSettingsApi() {
  const t = useTranslations("pages.Settings")
  const tErrors = useTranslations("errors")
  const { refetch, logout } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  const updateProfile = async (data: UpdateName) => {
    setLoading("profile")
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/name`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await jsonError<UpdateNameError>(response)
        return tErrors(error)
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch {
      return tErrors("update-name-error")
    } finally {
      setLoading(null)
    }
  }

  const updateUsername = async (data: UpdateUsername) => {
    setLoading("username")
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/username`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await jsonError<UpdateUsernameError>(response)
        return tErrors(error)
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch {
      return tErrors("update-username-error")
    } finally {
      setLoading(null)
    }
  }

  const updateEmail = async (data: UpdateEmail) => {
    setLoading("email")
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/email`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await jsonError<UpdateEmailError>(response)
        return tErrors(error)
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch {
      return tErrors("update-email-error")
    } finally {
      setLoading(null)
    }
  }

  const updatePassword = async (data: UpdatePassword) => {
    setLoading("password")
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/password`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await jsonError<UpdatePasswordError>(response)
        return tErrors(error)
      }

      toast.success(t("messages.save-success"))
    } catch {
      return tErrors("update-password-error")
    } finally {
      setLoading(null)
    }
  }

  const deleteAccount = async () => {
    setLoading("delete")
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/delete`,
        {
          method: "POST",
          credentials: "include",
        },
      )

      if (!response.ok) {
        const error = await jsonError<DeleteAccountError>(response)
        return tErrors(error)
      }

      toast.success(t("messages.account-deletion-scheduled"))
      logout()
    } catch {
      return tErrors("delete-account-error")
    } finally {
      setLoading(null)
    }
  }

  return {
    loading,
    updateProfile,
    updateUsername,
    updateEmail,
    updatePassword,
    deleteAccount,
  }
}
