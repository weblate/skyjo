import SignupAdvantages from "./SignupAdvantages"
import SignupForm from "./SignupForm"

const SignupServerPageProps = () => {
  return (
    <div className="min-h-[calc(100vh-52px)] w-full flex">
      {/* Desktop: Side-by-side layout */}
      <div className="hidden lg:flex lg:flex-row lg:items-center lg:min-h-[calc(100vh-52px)] w-full">
        <div className="lg:flex-1">
          <SignupAdvantages />
        </div>

        <div className="lg:flex-1 lg:flex lg:items-center lg:justify-center lg:px-8">
          <div className="max-w-md w-full">
            <SignupForm />
          </div>
        </div>
      </div>

      {/* Mobile: Form section */}
      <div className="lg:hidden flex flex-1 items-center justify-center px-4 pb-8">
        <div className="max-w-md w-full">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}

export default SignupServerPageProps
