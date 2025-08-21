import SignupAdvantages from "./SignupAdvantages"
import SignupForm from "./SignupForm"

const SignupServerPageProps = () => {
  return (
    <div className="min-h-[calc(100vh-52px)] w-full flex flex-col lg:flex-row">
      {/* Desktop: Show advantages on left side */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
        <SignupAdvantages />
      </div>

      {/* Form section - works for both mobile and desktop */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8 lg:px-8">
        <div className="max-w-md w-full">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}

export default SignupServerPageProps
