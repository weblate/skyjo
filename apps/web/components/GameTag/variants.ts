import { cva } from "class-variance-authority"

export const tagVariants = cva(
  "select-none flex flex-row items-center rounded-full px-2.5 py-0.5 text-xs text-black font-medium text-nowrap group",
  {
    variants: {
      tag: {
        classic: "bg-blue-300 dark:bg-blue-300/70",
        column: "bg-purple-300 dark:bg-purple-300/70",
        row: "bg-yellow-300 dark:bg-yellow-300/70",
        "short-game": "bg-green-300 dark:bg-green-300/70",
        "long-game": "bg-red-300 dark:bg-red-300/70",
      },
      clickable: {
        true: "cursor-pointer",
        false: "cursor-default",
      },
    },
  },
)
