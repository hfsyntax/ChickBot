import { Player } from "../types"

/**
 * Compares a players rating to their opponents rating to determine their winning probability.
 */
function calculateProbability(r1: number, r2: number) {
  return (1.0 * 1.0) / (1 + 1.0 * Math.pow(10, (1.0 * (r1 - r2)) / 400))
}

/**
 * Updates players elo who played a match against each other.
 *
 */
function calculateElo(player: Player, opponent: Player, result: number) {
  let playerProbability = calculateProbability(opponent.elo, player.elo)
  let opponentProbability = calculateProbability(player.elo, opponent.elo)
  let playerKFactor = 40
  let opponentKFactor = 40

  if (player.games >= 30) playerKFactor = 20

  if (opponent.games >= 30) opponentKFactor = 20

  if (result == 1) {
    player.elo = player.elo + playerKFactor * (1 - playerProbability)
    opponent.elo = opponent.elo + opponentKFactor * (0 - opponentProbability)
    player.won++
  } else if (result == 0.5) {
    player.elo = player.elo + playerKFactor * (0.5 - playerProbability)
    opponent.elo = opponent.elo + opponentKFactor * (0.5 - opponentProbability)
  } else {
    player.elo = player.elo + playerKFactor * (0 - playerProbability)
    opponent.elo = opponent.elo + opponentKFactor * (1 - opponentProbability)
    opponent.won++
  }

  player.games++
  opponent.games++
}

export { calculateElo }
