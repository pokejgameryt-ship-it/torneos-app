const { v4: uuidv4 } = require('uuid');

function nextPowerOf2(n) {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

function generateSeeding(numSeeds) {
  let seeds = [1, 2];
  while (seeds.length < numSeeds) {
    const sum = seeds.length * 2 + 1;
    const newSeeds = [];
    for (const seed of seeds) {
      newSeeds.push(seed);
      newSeeds.push(sum - seed);
    }
    seeds = newSeeds;
  }
  return seeds;
}

function getRoundName(bracketType, round, totalWBRounds, totalLBRounds) {
  if (bracketType === 'winners') {
    const remaining = totalWBRounds - round;
    if (remaining === 0) return 'Winners Final';
    if (remaining === 1) return 'Winners Semis';
    if (remaining === 2) return 'Winners Quarters';
    return `Winners R${round}`;
  }

  if (bracketType === 'losers') {
    if (round === totalLBRounds) return 'Losers Final';
    if (round === totalLBRounds - 1 && totalLBRounds >= 3) return 'Losers Semis';
    if (round === totalLBRounds - 2 && totalLBRounds >= 5) return 'Losers Quarters';
    return `Losers R${round}`;
  }

  if (bracketType === 'grand_final') {
    return 'Grand Final';
  }

  return `R${round}`;
}

function generateSingleElimination(participants) {
  const n = participants.length;
  const bracketSize = nextPowerOf2(n);
  const numByes = bracketSize - n;
  const numRounds = Math.log2(bracketSize);

  const seedOrder = generateSeeding(bracketSize);
  const matches = [];

  for (let round = 1; round <= numRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let pos = 1; pos <= matchesInRound; pos++) {
      const match = {
        id: uuidv4(),
        bracket_type: 'winners',
        round,
        position: pos,
        player1_id: null,
        player2_id: null,
        player1_score: 0,
        player2_score: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: null,
        next_slot: null,
        is_reset: 0,
        round_name: getRoundName('winners', round, numRounds, 0)
      };

      if (round === 1) {
        const idx1 = (pos - 1) * 2;
        const idx2 = idx1 + 1;
        const seed1 = seedOrder[idx1];
        const seed2 = seedOrder[idx2];

        if (seed1 <= n) match.player1_id = participants[seed1 - 1].id;
        if (seed2 <= n) match.player2_id = participants[seed2 - 1].id;

        if (seed1 > n && seed2 > n) {
          match.status = 'bye';
        } else if (seed1 > n) {
          match.winner_id = participants[seed2 - 1].id;
          match.status = 'bye';
        } else if (seed2 > n) {
          match.winner_id = participants[seed1 - 1].id;
          match.status = 'bye';
        } else {
          match.status = 'in_progress';
        }
      }

      matches.push(match);
    }
  }

  for (let round = 1; round < numRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    const matchesInNext = bracketSize / Math.pow(2, round + 1);

    for (let pos = 1; pos <= matchesInRound; pos++) {
      const currentMatch = matches.find(m => m.round === round && m.position === pos);
      if (!currentMatch) continue;

      const nextPos = Math.ceil(pos / 2);
      const nextMatch = matches.find(m => m.round === round + 1 && m.position === nextPos);

      if (nextMatch) {
        currentMatch.next_match_id = nextMatch.id;
        currentMatch.next_slot = pos % 2 === 1 ? 1 : 2;
      }
    }
  }

  let order = 1;
  for (const m of matches) {
    m.match_order = order++;
  }

  return {
    matches,
    metadata: {
      totalParticipants: n,
      bracketSize,
      numByes,
      numRounds,
      totalMatches: matches.length
    }
  };
}

function generateDoubleElimination(participants) {
  const n = participants.length;
  const bracketSize = nextPowerOf2(n);
  const numByes = bracketSize - n;
  const wbRounds = Math.log2(bracketSize);
  const lbRounds = 2 * (wbRounds - 1);

  const seedOrder = generateSeeding(bracketSize);
  const allMatches = [];

  for (let round = 1; round <= wbRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let pos = 1; pos <= matchesInRound; pos++) {
      const match = {
        id: uuidv4(),
        bracket_type: 'winners',
        round,
        position: pos,
        player1_id: null,
        player2_id: null,
        player1_score: 0,
        player2_score: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: null,
        next_slot: null,
        is_reset: 0,
        round_name: getRoundName('winners', round, wbRounds, lbRounds)
      };

      if (round === 1) {
        const idx1 = (pos - 1) * 2;
        const idx2 = idx1 + 1;
        const seed1 = seedOrder[idx1];
        const seed2 = seedOrder[idx2];

        if (seed1 <= n) match.player1_id = participants[seed1 - 1].id;
        if (seed2 <= n) match.player2_id = participants[seed2 - 1].id;

        if (seed1 > n && seed2 > n) {
          match.status = 'bye';
        } else if (seed1 > n) {
          match.winner_id = participants[seed2 - 1].id;
          match.status = 'bye';
        } else if (seed2 > n) {
          match.winner_id = participants[seed1 - 1].id;
          match.status = 'bye';
        } else {
          match.status = 'in_progress';
        }
      }

      allMatches.push(match);
    }
  }

  for (let round = 1; round <= lbRounds; round++) {
    let matchesInRound;
    if (round === 1) {
      matchesInRound = bracketSize / 2;
    } else if (round % 2 === 0) {
      matchesInRound = bracketSize / Math.pow(2, Math.ceil(round / 2) + 1);
      if (matchesInRound < 1) matchesInRound = 1;
    } else {
      matchesInRound = bracketSize / Math.pow(2, Math.ceil(round / 2) + 1);
      if (matchesInRound < 1) matchesInRound = 1;
    }

    for (let pos = 1; pos <= matchesInRound; pos++) {
      const match = {
        id: uuidv4(),
        bracket_type: 'losers',
        round,
        position: pos,
        player1_id: null,
        player2_id: null,
        player1_score: 0,
        player2_score: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: null,
        next_slot: null,
        is_reset: 0,
        round_name: getRoundName('losers', round, wbRounds, lbRounds)
      };
      allMatches.push(match);
    }
  }

  const grandFinal = {
    id: uuidv4(),
    bracket_type: 'grand_final',
    round: 1,
    position: 1,
    player1_id: null,
    player2_id: null,
    player1_score: 0,
    player2_score: 0,
    winner_id: null,
    status: 'pending',
    next_match_id: null,
    next_slot: null,
    is_reset: 0,
    round_name: 'Grand Final'
  };
  allMatches.push(grandFinal);

  const wbFinal = allMatches.find(m => m.bracket_type === 'winners' && m.round === wbRounds);
  if (wbFinal) {
    wbFinal.next_match_id = grandFinal.id;
    wbFinal.next_slot = 1;
  }

  const lbFinalRound = allMatches.filter(m => m.bracket_type === 'losers');
  const maxLbRound = Math.max(...lbFinalRound.map(m => m.round));
  const lbFinal = lbFinalRound.find(m => m.round === maxLbRound);
  if (lbFinal) {
    lbFinal.next_match_id = grandFinal.id;
    lbFinal.next_slot = 2;
  }

  for (let round = 1; round < wbRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let pos = 1; pos <= matchesInRound; pos++) {
      const currentMatch = allMatches.find(m => m.bracket_type === 'winners' && m.round === round && m.position === pos);
      if (!currentMatch) continue;

      const nextPos = Math.ceil(pos / 2);
      const nextMatch = allMatches.find(m => m.bracket_type === 'winners' && m.round === round + 1 && m.position === nextPos);
      if (nextMatch) {
        currentMatch.next_match_id = nextMatch.id;
        currentMatch.next_slot = pos % 2 === 1 ? 1 : 2;
      }
    }
  }

  let order = 1;
  for (const m of allMatches) {
    m.match_order = order++;
  }

  return {
    matches: allMatches,
    metadata: {
      totalParticipants: n,
      bracketSize,
      numByes,
      wbRounds,
      lbRounds,
      totalMatches: allMatches.length
    }
  };
}

function advanceWinner(matches, matchId, winnerId) {
  const match = matches.find(m => m.id === matchId);
  if (!match || !match.next_match_id) return;

  const nextMatch = matches.find(m => m.id === match.next_match_id);
  if (!nextMatch) return;

  if (match.next_slot === 1) {
    nextMatch.player1_id = winnerId;
  } else {
    nextMatch.player2_id = winnerId;
  }

  if (nextMatch.player1_id && nextMatch.player2_id) {
    nextMatch.status = 'in_progress';
  }
}

module.exports = {
  nextPowerOf2,
  generateSeeding,
  generateSingleElimination,
  generateDoubleElimination,
  advanceWinner,
  getRoundName
};
