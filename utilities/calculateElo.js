/**
 * Compares a players rating to their opponents rating to determine their winning probability.
 *
 * @param {number} r1 The players rating.
 * @param {number} r2 The opponents rating to compare against.
 * @returns {number} The probablity of the player winning.
 */
function calculateProbability(r1, r2) {
    return 1.0 * 1.0 / (1 + 1.0 * Math.pow(10, 1.0 * (r1 - r2) / 400))
}

/**
 * Updates players elo who played a match against each other.
 *
 * @param {object} a The first player.
 * @param {object} b The second player.
 * @param {number} result The result of the match. 1 = a won, 0 = b won, 0.5 = tie 
 * @returns {void}
 */
function calculateElo(a, b, result) {
    let initial_a = a.elo
    let initial_b = b.elo

    let a_prob = calculateProbability(b.elo, a.elo)
    let b_prob = calculateProbability(a.elo, b.elo)
    let kval_a = 40
    let kval_b = 40

    if (a.games >= 30)
        kval_a = 20

    if (b.games >= 30)
        kval_b = 20

    if (result == 1) {
        a.elo = a.elo + kval_a * (1 - a_prob)
        b.elo = b.elo + kval_b * (0 - b_prob)
        a.won++
    }
    else if (result == 0.5) {
        a.elo = a.elo + kval_a * (0.5 - a_prob)
        b.elo = b.elo + kval_b * (0.5 - b_prob)
        b.won++
    }
    else {
        a.elo = a.elo + kval_a * (0 - a_prob)
        b.elo = b.elo + kval_b * (1 - b_prob)
    }

    a.games++
    b.games++
}

export { calculateElo }