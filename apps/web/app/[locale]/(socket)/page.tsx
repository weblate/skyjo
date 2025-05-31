import { RulesButton } from "@/app/[locale]/(socket)/RulesButton"
import Banner from "@/components/Banner"
import Footer from "@/components/Footer"
import MovingArrow from "@/components/MovingArrow"
import Navbar from "@/components/Navbar"
import PWABanner from "@/components/PWABanner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { use } from "react"
import IndexPage from "./IndexPage"

interface SearchParams {
  gameCode?: string
}
interface IndexServerPageProps {
  searchParams: Promise<SearchParams>
}
const IndexServerPage = (props: IndexServerPageProps) => {
  const searchParams = use(props.searchParams)
  const t = useTranslations("pages.Index")

  const rulesLink = (chunks: React.ReactNode) => (
    <Link href="/rules" className="underline">
      {chunks}
    </Link>
  )

  return (
    <div className="bg-body dark:bg-dark-body flex flex-col">
      <div className="relative h-dvh flex flex-col">
        <PWABanner />
        <Banner />
        <Navbar className="mt-4" />
        <div className="flex flex-col grow items-center justify-between p-6">
          <div className="flex flex-col grow w-full items-center justify-center">
            <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border px-16 py-12 rounded-xl w-full max-w-md md:max-w-xl flex flex-col items-center">
              <h1 className="sr-only">Play Skyjo Online Free - Skymo</h1>
              <IndexPage searchParams={searchParams} />
            </div>
          </div>
          <div className="flex flex-row w-full z-10 items-center justify-between">
            <Link
              href="https://discord.gg/qKsaXebPyx"
              target="_blank"
              className="w-20"
            >
              <Image
                src="/svg/discord.svg"
                width={24}
                height={24}
                alt="Discord server invite icon"
                className="dark:invert"
              />
            </Link>
            <MovingArrow href="#explanation" />
            {process.env.npm_package_version ? (
              <Link
                href="https://github.com/maxentr/skymo/releases/latest"
                target="_blank"
                className="underline underline-offset-2 w-20 text-end"
              >
                v{process.env.npm_package_version}
              </Link>
            ) : (
              <span className="w-20 h-1" />
            )}
          </div>
        </div>
      </div>
      <section className="container my-8 max-w-4xl flex flex-col items-center">
        <h2
          id="explanation"
          className="text-center text-3xl text-black dark:text-dark-font pt-2 mb-4"
        >
          {t("explanation.title")}
        </h2>
        <p className="text-justify text-black dark:text-dark-font">
          {t("explanation.content")}
        </p>
        <RulesButton text={t("explanation.button")} />
      </section>

      <section className="container mt-16 mb-32 max-w-4xl flex flex-col items-center">
        <h2 className="text-center text-3xl text-black dark:text-dark-font mb-4">
          {t("faq.title")}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>{t("faq.meaning.title")}</AccordionTrigger>
            <AccordionContent>{t("faq.meaning.content")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>{t("faq.pronounce.title")}</AccordionTrigger>
            <AccordionContent>{t("faq.pronounce.content")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>{t("faq.how-to-play.title")}</AccordionTrigger>
            <AccordionContent>
              {t.rich("faq.how-to-play.content", {
                rules: rulesLink,
              })}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>{t("faq.how-to-win.title")}</AccordionTrigger>
            <AccordionContent>{t("faq.how-to-win.content")}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger className="text-start">
              {t("faq.play-classic-with-action.title")}
            </AccordionTrigger>
            <AccordionContent>
              {t("faq.play-classic-with-action.content")}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
      <Footer />
    </div>
  )
}

export default IndexServerPage
