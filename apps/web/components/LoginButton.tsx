"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const LoginButton = () => {
  const t = useTranslations("components.LoginButton")
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || user) return null

  return (
    <Link
      href="/login"
      className={cn(
        buttonVariants(),
        "h-9 rounded-full bg-teal-700 dark:bg-teal-900 text-teal-50 dark:text-dark-font hover:bg-teal-800 dark:hover:bg-teal-950",
      )}
    >
      {t("login")}
    </Link>
  )
}

export default LoginButton
