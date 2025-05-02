import { cn } from "@/lib/utils"
import { VariantProps, cva } from "class-variance-authority"
import { ClassValue } from "clsx"
import { Trash2Icon } from "lucide-react"

export const cardVariants = cva(
  "text-black border-black flex justify-center items-center select-none focus-visible:outline-black focus-visible:-outline-offset-4 transition-all",
  {
    variants: {
      size: {
        preview: " h-3 w-2 border rounded-sm text-transparent",
        tiny: " h-12 w-8 border-[1.5px] rounded text-base",
        small: "h-12 w-8 border-[1.5px] rounded text-base",
        normal: [
          "w-8 h-[43px] border-2 rounded text-lg",
          "mdh:w-8 mdh:h-[43px] mdh:border-2 mdh:rounded mdh:text-lg",
          "xl:lgh:w-10 xl:lgh:h-[53px] xl:lgh:border-2 xl:lgh:rounded-md xl:lgh:text-xl",
          "2xl:xlh:h-16 2xl:xlh:w-12 2xl:xlh:border-2 2xl:xlh:rounded-md 2xl:xlh:text-2xl",
        ],
        big: "h-12 w-8 smh:h-16 smh:w-12 xlh:h-20 xlh:w-14 border-2 rounded mdh:rounded-md text-base mdh:text-2xl",
      },
      type: {
        hidden: "border-none bg-transparent",
        discard:
          "bg-transparent border-dashed border-card-discard dark:border-dark-card-discard !shadow-none focus-visible:outline-card-discard",
        "no-card":
          "bg-transparent border-dashed border-black dark:border-dark-card-empty !shadow-none",
        "not-visible":
          "bg-card-not-visible text-card-not-visible dark:bg-dark-card-not-visible dark:text-dark-card-not-visible",
        negative: "bg-card-negative dark:bg-dark-card-negative",
        neutral: "bg-card-neutral dark:bg-dark-card-neutral",
        low: "bg-card-low dark:bg-dark-card-low",
        medium: "bg-card-medium dark:bg-dark-card-medium",
        high: "bg-card-high dark:bg-dark-card-high",
      },
      shadow: {
        true: "",
        false: "",
      },
      disabled: {
        true: "",
        false: "",
      },
      loading: {
        true: "animate-loading-card",
        false: "",
      },
      onClickExist: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        loading: false,
        disabled: false,
        onClickExist: true,
        className: "cursor-pointer",
      },
      {
        shadow: true,
        size: "tiny",
        className: "shadow-[0.75px_0.75px_0px_0px_rgba(0,0,0)]",
      },
      {
        shadow: true,
        size: "small",
        className: "shadow-[0.75px_0.75px_0px_0px_rgba(0,0,0)]",
      },
      {
        shadow: true,
        size: "normal",
        className:
          "shadow-[0.75px_0.75px_0px_0px_rgba(0,0,0)] mdh:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0)]",
      },
      {
        shadow: true,
        size: "big",
        className:
          "shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0)] xlh:shadow-[2px_2px_0px_0px_rgba(0,0,0)]",
      },
    ],
  },
)

type CardVariants = VariantProps<typeof cardVariants>
type CardVisualType = CardVariants["type"]
type CardSize = CardVariants["size"]

type CardValue = number | "no-card" | "discard" | "hidden" | "back"
const valueMap: Record<string, CardVisualType> = {
  "-2": "negative",
  "-1": "negative",
  "0": "neutral",
  "1": "low",
  "2": "low",
  "3": "low",
  "4": "low",
  "5": "medium",
  "6": "medium",
  "7": "medium",
  "8": "medium",
  "9": "high",
  "10": "high",
  "11": "high",
  "12": "high",
}
const getCardVisualType = (value?: CardValue): CardVisualType => {
  if (typeof value === "undefined" || value === "back") return "not-visible"
  if (typeof value === "string") return value

  return valueMap[value.toString()] || "not-visible"
}

export interface CardProps extends CardVariants {
  value?: CardValue
  onClick?: () => void
  className?: ClassValue
  title?: string
  disabled?: boolean
  loading?: boolean
  as?: "button" | "div"
}
const Card = ({
  value,
  size = "normal",
  onClick,
  className,
  title,
  disabled = false,
  loading = false,
  shadow = true,
  as = "button",
}: CardProps) => {
  const cardType = getCardVisualType(value)

  const onClickExist = typeof onClick === "function"
  const cardClass: ClassValue = cn(
    cardVariants({
      size,
      disabled,
      loading,
      shadow,
      type: cardType,
      onClickExist,
    }),
    "ph-no-capture",
    className,
  )

  if (as === "div") {
    // Render as a non-interactive div (no button props)
    return (
      <div className={cardClass} title={title}>
        <Content cardType={cardType} value={value} size={size} />
      </div>
    )
  }

  // Default: render as a button
  return (
    <button
      className={cardClass}
      onClick={onClick}
      title={title}
      disabled={disabled || loading}
    >
      <Content cardType={cardType} value={value} size={size} />
    </button>
  )
}

const throwIconClass = cva(
  "aspect-square text-card-discard dark:text-dark-card-discard",
  {
    variants: {
      size: {
        preview: "w-0",
        tiny: "w-4",
        small: "w-5",
        normal: "w-5 md:w-6",
        big: "w-8",
      },
    },
  },
)
interface ContentProps {
  cardType: CardVisualType
  value?: CardValue
  size: CardSize
}
const Content = ({ cardType, value, size }: ContentProps) => {
  const isGameCard =
    value !== null &&
    value !== undefined &&
    Number(value) >= -2 &&
    Number(value) <= 12

  if (cardType === "discard") {
    return <Trash2Icon className={throwIconClass({ size })} />
  }

  if (isGameCard) {
    return value
  }

  return null
}

export { Card }
