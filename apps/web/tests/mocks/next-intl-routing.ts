export const defineRouting = (config: any) => ({
  ...config,
  locales: config.locales || ["en"],
  defaultLocale: config.defaultLocale || "en",
})
