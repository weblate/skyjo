export interface SightEngineMessage {
  status: string
  request: Request
  profanity: ContentTrade<
    "sexual" | "discriminatory" | "insult" | "inappropriate" | "grawlix"
  >
  personal: ContentTrade<
    | "email"
    | "phone_number_en"
    | "phone_number_fr"
    | "phone_number_es"
    | "username"
    | "ssn"
    | "ip"
  >
  link: ContentTrade<"link">
  medical: ContentTrade<"medical">
  weapon: ContentTrade<"weapon">
  extremism: ContentTrade<
    "people" | "group" | "movement" | "keyword" | "slogan"
  >
  drug: ContentTrade<"drug">
  "self-harm": ContentTrade<"self-harm">
  violence: ContentTrade<"violence">
  "content-trade": ContentTrade<"content-trade">
  "money-transaction": ContentTrade<"money-transaction">
  spam: ContentTrade<"spam">
}

export interface ContentTrade<T extends string> {
  matches: Match<T>[]
}

export interface Match<T extends string> {
  type: T
  intensity: "low" | "medium" | "high"
  match: string
  start: number
  end: number
}

export interface Request {
  id: string
  timestamp: number
  operations: number
}
