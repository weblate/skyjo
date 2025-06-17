"use client"

import {
  avatarVariants,
  backgroundVariants,
} from "@/app/[locale]/u/[username]/UserProfile"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Avatar, Constants as CoreConstants } from "@skymo/core"
import { UpdateAvatarError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { CheckIcon } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"

interface AvatarSelectorProps {
  currentAvatar?: Avatar
  onAvatarChange: (avatar: Avatar) => void
}

export function AvatarSelector({
  currentAvatar = "bee",
  onAvatarChange,
}: AvatarSelectorProps) {
  const t = useTranslations("pages.Settings.messages")
  const tProfile = useTranslations("pages.SettingsProfile")
  const tAvatar = useTranslations("utils.avatar")
  const tErrors = useTranslations("errors")

  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar)
  const [loading, setLoading] = useState(false)

  const avatars = Object.values(CoreConstants.AVATARS)

  const handleAvatarSelect = (avatar: Avatar) => {
    setSelectedAvatar(avatar)
  }

  const handleSave = async () => {
    if (selectedAvatar === currentAvatar) return

    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/avatar`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            avatar: selectedAvatar,
          }),
        },
      )

      if (!res.ok) {
        const error = await jsonError<UpdateAvatarError>(res)
        toast.error(tErrors(error))
      }

      onAvatarChange(selectedAvatar)
      toast.success(t("save-success"))
    } catch {
      toast.error(tErrors("unexpected-error"))
      setSelectedAvatar(currentAvatar)
    } finally {
      setLoading(false)
    }
  }

  const isDirty = selectedAvatar !== currentAvatar

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {avatars.map((avatar) => {
          const isSelected = selectedAvatar === avatar

          return (
            <div key={avatar} className="relative w-fit">
              <button
                className={cn(backgroundVariants({ avatar }), "size-16")}
                onClick={() => handleAvatarSelect(avatar)}
                type="button"
              >
                <Image
                  src={`/avatars/${avatar}.svg`}
                  width={32}
                  height={32}
                  alt={tAvatar(avatar)}
                  className={avatarVariants({ avatar })}
                />
                <AnimatePresence>
                  {isSelected && (
                    <m.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="absolute top-0 right-0 bg-black dark:bg-white rounded-full p-1"
                    >
                      <CheckIcon className="h-3 w-3 text-white dark:text-black" />
                    </m.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          )
        })}
      </div>

      <Button
        onClick={handleSave}
        loading={loading}
        className="w-full sm:w-auto"
        disabled={!isDirty}
      >
        {tProfile("fields.avatar.submit")}
      </Button>
    </div>
  )
}
