// Helper function to parse JSON error response
export async function jsonError<
  TOverride extends string,
  TError extends string = string,
>(response: { json(): Promise<{ error: TError }> }) {
  const { error } = await response.json()
  return error as unknown as TOverride
}
