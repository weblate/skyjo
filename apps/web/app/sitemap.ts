import { routing } from "@/i18n/routing"
import { MetadataRoute } from "next"

interface Page {
  name: string
  priority: number
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never"
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const pages: Page[] = [
    {
      name: "",
      priority: 1,
      changefreq: "weekly",
    },
    {
      name: "search",
      priority: 0.9,
      changefreq: "weekly",
    },
    {
      name: "create",
      priority: 0.9,
      changefreq: "weekly",
    },
    {
      name: "rules",
      priority: 0.8,
      changefreq: "monthly",
    },
    {
      name: "privacy-policy",
      priority: 0.7,
      changefreq: "monthly",
    },
  ]

  const sitemap = pages.map((page) => {
    return routing.locales.map((locale) => {
      let url: string = ""
      if (locale === routing.defaultLocale) {
        url = `${baseUrl}/${page.name}`
      } else if (page.name === "") {
        url = `${baseUrl}/${locale}`
      } else {
        url = `${baseUrl}/${locale}/${page.name}`
      }

      return {
        url,
        lastModified: new Date(),
        priority: page.priority,
        changeFrequency: page.changefreq,
      }
    })
  })

  return sitemap.flat()
}
