"use client"

import { useTranslations } from "next-intl"
import { ChangeEvent } from "react"
import GameLobbyButtons from "@/components/GameLobbyButtons"
import SelectAvatar from "@/components/SelectAvatar"
import { Input } from "@/components/ui/input"
import { usePlayer } from "@/contexts/PlayerContext"

interface Props {
  searchParams: {
    gameCode?: string
  }
}

const IndexPage = ({ searchParams }: Props) => {
  const t = useTranslations("pages.Index")
  const { name, setName, avatarIndex, setAvatarIndex } = usePlayer()

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
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
