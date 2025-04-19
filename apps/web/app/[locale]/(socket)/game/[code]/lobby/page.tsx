import Lobby from "./Lobby"

interface LobbyLayoutParams {
  code: string
  locale: string
}
interface LobbyServerPageProps {
  params: Promise<LobbyLayoutParams>
}

const LobbyServerPage = async (props: LobbyServerPageProps) => {
  const { code } = await props.params

  return <Lobby gameCode={code} />
}

export default LobbyServerPage
