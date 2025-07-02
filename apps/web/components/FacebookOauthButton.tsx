// import { Button } from "@/components/ui/button"
// import Image from "next/image"
// import { startTransition } from "react"

// type FacebookOauthResponse =
//   | {
//       success: true
//       redirectUrl?: string
//     }
//   | {
//       success: false
//       message: string
//     }

// const FacebookOauthButton = () => {
//   const actionClick = async () => {
//     const response = await fetch(
//       `${process.env.NEXT_PUBLIC_API_URL}/auth/login/facebook`,
//     )
//     const result = (await response.json()) as FacebookOauthResponse
//     if (!result.success) {
//       throw new Error(result.message || "Failed to initiate Facebook login")
//     }

//     if (result.redirectUrl) {
//       window.location.href = result.redirectUrl
//     }
//   }

//   return (
//     <Button
//       onClick={() => startTransition(async () => await actionClick())}
//       color="blue"
//       className="w-full gap-2 font-medium"
//     >
//       <span className="w-8">
//         <Image
//           src="/auth/facebook.svg"
//           alt=""
//           width={12}
//           height={19}
//           className="mx-auto"
//           draggable={false}
//         />
//       </span>
//       <span className="w-16 text-left">Facebook</span>
//     </Button>
//   )
// }

// export default FacebookOauthButton
