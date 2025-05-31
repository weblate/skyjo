import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"

export interface ResetPasswordLayoutProps {
  children: React.ReactNode
}
export default async function ResetPasswordLayout({
  children,
}: ResetPasswordLayoutProps) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
