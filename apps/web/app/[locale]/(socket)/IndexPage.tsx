"use client"

import GameLobbyButtons from "@/components/GameLobbyButtons"
import SelectAvatar from "@/components/SelectAvatar"
import { Input } from "@/components/ui/input"
import { useUser } from "@/contexts/UserContext"
import { useTranslations } from "next-intl"
import { ChangeEvent } from "react"

interface Props {
  searchParams: {
    gameCode?: string
  }
}

const IndexPage = ({ searchParams }: Props) => {
  const t = useTranslations("pages.Index")
  const { name, setName, avatarIndex, setAvatarIndex } = useUser()

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const newValue = value.replace(/ /g, "_")

    setName(newValue)
  }

  return (
    <>
      <SelectAvatar
        containerClassName="mb-4"
        value={avatarIndex}
        onChange={setAvatarIndex}
      />
      <Input
        placeholder={t("name-input-placeholder")}
        value={name}
        maxLength={20}
        onChange={onChange}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
      />
      <GameLobbyButtons gameCode={searchParams.gameCode} />
    </>
  )
}

export default IndexPage
