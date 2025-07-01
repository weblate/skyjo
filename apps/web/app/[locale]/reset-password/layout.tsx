import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"

interface ResetPasswordLayoutProps {
  children: React.ReactNode
}
export default async function ResetPasswordLayout({
  children,
}: Readonly<ResetPasswordLayoutProps>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
