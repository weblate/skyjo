import { CheckIcon } from "lucide-react"
import { useTranslations } from "next-intl"

const SignupAdvantages = () => {
  const t = useTranslations("pages.Signup")

  const features = [
    {
      id: "track-progress",
      title: t("advantages.features.track-progress.title"),
      description: t("advantages.features.track-progress.description"),
      comingSoon: false,
    },
    {
      id: "personalized-experience",
      title: t("advantages.features.personalized-experience.title"),
      description: t("advantages.features.personalized-experience.description"),
      comingSoon: false,
    },
    {
      id: "join-community",
      title: t("advantages.features.join-community.title"),
      description: t("advantages.features.join-community.description"),
      comingSoon: false,
    },
    {
      id: "exclusive-content",
      title: t("advantages.features.exclusive-content.title"),
      description: t("advantages.features.exclusive-content.description"),
      comingSoon: true,
    },
  ]

  return (
    <div className="flex items-center justify-center lg:px-8 lg:py-0">
      <div className="max-w-md w-full text-center lg:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 lg:mb-6">
          {t("advantages.title")}
        </h1>
        <p className="text-base lg:text-lg text-gray-600 dark:text-gray-300 mb-6 lg:mb-8">
          {t("advantages.subtitle")}
        </p>
        <div className="space-y-4 lg:space-y-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="flex items-start gap-3 lg:gap-4 text-left"
            >
              <div className="flex-shrink-0 size-5 lg:size-6 bg-green-200 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckIcon className="size-3 lg:size-4 text-green-700 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base">
                    {feature.title}
                  </h3>
                  {feature.comingSoon && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SignupAdvantages
