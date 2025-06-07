import { useAuth } from "@/hooks/useAuth"
import {
  type UpdateEmail,
  type UpdateName,
  type UpdatePassword,
  type UpdateUsername,
} from "@skymo/shared/validations"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

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
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update profile")
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch (_error) {
      toast.error(t("messages.save-error"))
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
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 409) {
          throw new Error(t("messages.username-taken"))
        }
        throw new Error(error.error || "Failed to update username")
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.save-error")
      toast.error(message)
      throw error
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
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 409) {
          throw new Error(t("messages.email-taken"))
        }
        throw new Error(error.error || "Failed to update email")
      }

      await refetch()
      toast.success(t("messages.save-success"))
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.save-error")
      toast.error(message)
      throw error
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
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 400) {
          throw new Error(t("messages.password-incorrect"))
        }
        throw new Error(error.error || "Failed to update password")
      }

      toast.success(t("messages.save-success"))
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.save-error")
      toast.error(message)
      throw error
    } finally {
      setLoading(null)
    }
  }

  const deleteAccount = async () => {
    setLoading("delete")
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me`,
        {
          method: "DELETE",
          credentials: "include",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to delete account")
      }

      logout()
      toast.success(t("messages.delete-success"))
    } catch (_error) {
      toast.error("Failed to delete account. Please try again.")
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