import {
  passwordLowercaseRegex,
  passwordNumberRegex,
  passwordSpecialCharRegex,
  passwordUppercaseRegex,
} from "@skymo/shared/validations"
import { CheckIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

interface PasswordRequirementsProps {
  password: string | undefined
}

const requirements = [
  {
    label: "10-characters",
    test: (pw: string) => pw.length >= 10,
  },
  {
    label: "lowercase-letter",
    test: (pw: string) => passwordLowercaseRegex.test(pw),
  },
  {
    label: "capital-letter",
    test: (pw: string) => passwordUppercaseRegex.test(pw),
  },
  {
    label: "number",
    test: (pw: string) => passwordNumberRegex.test(pw),
  },
  {
    label: "special-character",
    test: (pw: string) => passwordSpecialCharRegex.test(pw),
  },
] as const

export const PasswordRequirements = ({
  password = "",
}: PasswordRequirementsProps) => {
  const t = useTranslations("components.PasswordRequirements")
  
  return (
    <ul className="pt-1 pl-1 space-y-1 text-sm text-gray-700">
      {requirements.map((req, _i) => {
        const met = req.test(password)
        return (
          <li key={req.label} className="flex items-center gap-1">
            {met ? (
              <CheckIcon className="size-4 text-green-600" />
            ) : (
              <XIcon className="size-4 text-gray-400" />
            )}
            <span className={met ? "text-green-700" : "text-gray-600"}>
              {t(req.label)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default PasswordRequirements
