export const createNavigation = () => ({
  Link: () => null,
  redirect: () => {},
  usePathname: () => "",
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
})
