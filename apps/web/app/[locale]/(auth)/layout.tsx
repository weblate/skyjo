import Footer from "@/components/Footer"

export interface AuthLayoutProps {
  children: React.ReactNode
}
export default async function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
