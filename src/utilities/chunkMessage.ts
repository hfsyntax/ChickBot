/**
 * Split message into multiple messages per discord message limit
 */
export default function chunkMessage(message: string) {
  const DISCORD_MAX_MESSAGE_LENGTH = 2000
  const chunks: string[] = []
  let currentIndex = 0

  while (currentIndex < message.length) {
    chunks.push(
      message.slice(currentIndex, currentIndex + DISCORD_MAX_MESSAGE_LENGTH)
    )
    currentIndex += DISCORD_MAX_MESSAGE_LENGTH
  }

  return chunks
}
