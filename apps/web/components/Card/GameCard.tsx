"use client"

import "./Card.css"

import { Card, CardProps, cardVariants } from "@/components/Card/Card"
import { cn } from "@/lib/utils"
import { CardToJson } from "@skymo/core"
import { ClassValue } from "clsx"
import { TargetAndTransition, m } from "motion/react"
import { useEffect, useState } from "react"

const FLIP_DURATION_MS = 500

const cardPositionClass: ClassValue =
  "absolute w-full h-full card-backface-hidden"

const exitAnimation: TargetAndTransition = {
  opacity: 0,
  scale: 0,
  transition: {
    duration: 2,
    ease: "easeInOut",
  },
}

interface GameCardProps extends Omit<CardProps, "value"> {
  card: CardToJson
  onClick?: () => void
  showFlipAnimation?: boolean
  showExitAnimation?: boolean
}
export const GameCard = ({
  card,
  onClick,
  size = "normal",
  disabled = false,
  loading = false,
  showFlipAnimation = true,
  showExitAnimation = false,
  className,
}: GameCardProps) => {
  const [displayedValue, setDisplayedValue] = useState(card.value)
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    if (!showFlipAnimation) {
      setDisplayedValue(card.value)
      return
    }

    setIsFlipping(true)

    if (card.isVisible) {
      setDisplayedValue(card.value)
    } else {
      setTimeout(() => {
        setDisplayedValue(card.value)
      }, FLIP_DURATION_MS)
    }

    const flipTimer = setTimeout(() => {
      setIsFlipping(false)
    }, FLIP_DURATION_MS)

    return () => clearTimeout(flipTimer)
  }, [showFlipAnimation, card.value, card.isVisible])

  const handleClick = () => {
    if (isFlipping) return
    onClick?.()
  }

  return (
    <m.button
      className={cn(
        cardVariants({
          size,
          disabled,
          loading,
          shadow: false,
          type: "hidden",
        }),
        "group/card card-perspective-1000 focus-visible:outline-none",
        className,
      )}
      onClick={handleClick}
      disabled={disabled || loading}
      initial={{
        scale: 0.3,
        opacity: 0,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.2,
          ease: "easeIn",
        },
      }}
      exit={showExitAnimation ? exitAnimation : undefined}
    >
      <div
        className={cn(
          "relative w-full h-full card-preserve-3d",
          showFlipAnimation && "transition-all duration-500",
          card.isVisible ? "card-rotate-y-180" : "card-rotate-y-0",
        )}
      >
        <Card
          className={cn(
            cardPositionClass,
            "bg-white",
            "group-focus-visible/card:outline group-focus-visible/card:outline-2 group-focus-visible/card:outline-black group-focus-visible/card:-outline-offset-[6px]",
          )}
          size={size}
          as="div"
        />
        <Card
          value={displayedValue}
          className={cn(
            cardPositionClass,
            "card-rotate-y-180",
            "group-focus-visible/card:outline group-focus-visible/card:outline-2 group-focus-visible/card:outline-black group-focus-visible/card:-outline-offset-[6px]",
          )}
          size={size}
          as="div"
        />
      </div>
    </m.button>
  )
}
