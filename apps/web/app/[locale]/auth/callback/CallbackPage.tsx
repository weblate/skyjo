"use client"

import { useRouter } from "@/i18n/routing"
import { useEffect } from "react"

export default function CallbackLogic() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/profile"), 100)

    return () => clearTimeout(timer)
  }, [router])

  return null
}
