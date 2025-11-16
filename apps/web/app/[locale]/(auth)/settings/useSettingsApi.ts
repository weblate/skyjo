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
import { useAuth } from "@/hooks/useAuth"

export function useSettingsApi() {
  const t = useTranslations("pages.Settings")
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
        return await jsonError<UpdateNameError>(response)
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch {
      return "update-name-error"
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
        return await jsonError<UpdateUsernameError>(response)
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch {
      return "update-username-error"
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
        return await jsonError<UpdateEmailError>(response)
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch {
      return "update-email-error"
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
        return await jsonError<UpdatePasswordError>(response)
      }

      toast.success(t("messages.save-success"))
    } catch {
      return "update-password-error"
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
        return await jsonError<DeleteAccountError>(response)
      }

      toast.success(t("messages.account-deletion-scheduled"))
      logout()
    } catch {
      return "delete-account-error"
    } finally {
      setLoading(null)
    }
  }

  const updateAnalyticsConsent = async (analyticsConsent: boolean) => {
    setLoading("analytics")
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/analytics-consent`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ analyticsConsent }),
        },
      )

      if (!response.ok) {
        throw new Error("Failed to update analytics consent")
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch {
      toast.error(t("messages.save-error"))
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
    updateAnalyticsConsent,
  }
}
