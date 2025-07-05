"use client"

import { ClassValue } from "clsx"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { AVATARS_ARRAY } from "@/contexts/PlayerContext"
import { cn } from "@/lib/utils"

interface SelectAvatarProps {
  containerClassName?: ClassValue
  className?: ClassValue
  value: number
  onChange: (avatarIndex: number) => void
  disabled?: boolean
}
const SelectAvatar = ({
  containerClassName,
  className,
  value,
  onChange,
  disabled,
}: SelectAvatarProps) => {
  const tAvatar = useTranslations("utils.avatar")

  const handlePrevious = () => {
    if (disabled) return

    const newIndex = value === 0 ? AVATARS_ARRAY.length - 1 : value - 1
    onChange(newIndex)
  }

  const handleNext = () => {
    if (disabled) return

    const newIndex = value === AVATARS_ARRAY.length - 1 ? 0 : value + 1
    onChange(newIndex)
  }

  const avatar = AVATARS_ARRAY[value]

  return (
    <div className={cn("flex flex-row gap-2 items-center", containerClassName)}>
      <ChevronLeftIcon
        className="size-6 cursor-pointer text-black dark:text-dark-font"
        onClick={handlePrevious}
      />
      <AnimatePresence mode="popLayout" initial={false}>
        <m.div
          key={value}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3 }}
        >
          {avatar ? (
            <Image
              src={`/avatars/${avatar}.svg`}
              width={100}
              height={100}
              alt={tAvatar(avatar)}
              title={tAvatar(avatar)}
              className={cn(
                "select-none size-16 sm:size-20 dark:opacity-90",
                className,
              )}
              priority
            />
          ) : (
            <div className="flex items-center justify-center size-16 sm:size-20">
              <div className="bg-zinc-200 rounded-lg animate-pulse size-12" />
            </div>
          )}
        </m.div>
      </AnimatePresence>
      <ChevronRightIcon
        className="h-6 w-6 cursor-pointer text-black dark:text-dark-font"
        onClick={handleNext}
      />
    </div>
  )
}

export default SelectAvatar
