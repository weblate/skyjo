"use client"

import { SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface UserSearchProps {
  className?: string
}

export const UserSearch = ({ className }: UserSearchProps) => {
  const [searchValue, setSearchValue] = useState("")
  const router = useRouter()
  const t = useTranslations("pages.UserProfile")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      const username = searchValue
      router.push(`/u/${username}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={t("search.placeholder")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="min-w-64"
        />
        <Button type="submit" variant="icon">
          <SearchIcon className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
