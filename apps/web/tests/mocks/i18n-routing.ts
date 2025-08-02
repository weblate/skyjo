export const routing = {
  defaultLocale: "en",
  locales: ["en"],
  localePrefix: "as-needed",
  localeDetection: true,
}

export const generateAlternatesLanguages = () => ({})

export const Link = () => null
export const redirect = () => {}
export const usePathname = () => ""
export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
  prefetch: () => {},
})

export default {
  routing,
  generateAlternatesLanguages,
  Link,
  redirect,
  usePathname,
  useRouter,
}
