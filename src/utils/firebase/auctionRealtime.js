import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";
import { AppError } from "./errors";
import {
  computeGenderQuota,
  computePoolGenderTotals,
  computeTotalSlotsPerTeam,
  countTeamRoster,
  isGenderCapped,
  maxBidCapForTeam,
} from "../auctionQuota";

export const DEFAULT_LADDER = [
  { upTo: 1000, increment: 50 },
  { upTo: 5000, increment: 100 },
  { upTo: 20000, increment: 250 },
];

// Pure, unit-testable: given the current price and a ladder of {upTo, increment} rungs
// (ascending, no explicit "infinity" rung -- prices above the highest threshold just keep
// using that rung's increment), returns the next bid amount.
export function nextIncrement(currentPrice, ladder) {
  const rungs = ladder && ladder.length ? ladder : DEFAULT_LADDER;
  const sorted = [...rungs].sort((a, b) => a.upTo - b.upTo);
  const matched = sorted.find((r) => currentPrice < r.upTo);
  const increment_ = matched ? matched.increment : sorted[sorted.length - 1].increment;
  return currentPrice + increment_;
}

function stateRef(eventId) {
  return doc(db, "events", eventId, "auction", "state");
}

export function subscribeToAuctionState(eventId, callback) {
  return onSnapshot(stateRef(eventId), (snap) => callback(snap.exists() ? snap.data() : null));
}

// Idempotent: creates the single auction/state doc on first visit to the console, leaves it
// alone on every later visit.
export async function getOrCreateAuctionState(eventId) {
  const ref = stateRef(eventId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const initial = {
    status: "not_started",
    currentPlayerId: null,
    currentPrice: 0,
    currentHighBidTeamId: null,
    currentHighBidderUid: null,
    basePrice: 0,
    // false the instant a player goes on the block -- bidding only opens once the organizer
    // explicitly clicks "Start bidding", so everyone has a moment to see who's up before the
    // clock (if any) starts and reps can act.
    biddingOpen: false,
    incrementLadder: DEFAULT_LADDER,
    // 0 = no timer (organizer paces manually, the original behavior). When set, every bid pushes
    // the deadline back by this many seconds, so the clock always reflects "time since the last
    // bid" -- standard auction pacing.
    bidTimerSeconds: 0,
    blockDeadlineAt: null,
    round: 0,
    version: 0,
    undo: null,
    // The single most recent bid on the player currently on the block -- lets the team that placed
    // it withdraw it (see withdrawBid) as long as no one has bid over them since. Cleared whenever
    // the block moves to a new player or the sale is confirmed, same lifecycle as `undo`.
    lastBid: null,
    updatedAt: serverTimestamp(),
    updatedBy: null,
  };
  await setDoc(ref, initial);
  return initial;
}

// Lets an organizer tune the bid ladder and the per-player countdown per event instead of being
// stuck with the hardcoded default -- different events have very different budget scales and pace.
export async function updateAuctionRules(eventId, { incrementLadder, bidTimerSeconds }, organizerUid) {
  await updateDoc(stateRef(eventId), {
    incrementLadder,
    bidTimerSeconds,
    updatedAt: serverTimestamp(),
    updatedBy: organizerUid,
  });
}

// Organizer-only actions (full write access under Security Rules) -- no transaction needed
// since only one organizer console drives these at a time and a harmless double-write from two
// organizer tabs isn't a correctness problem the way a mis-priced sale would be.

export async function startPlayerOnBlock(eventId, player, organizerUid) {
  await updateDoc(stateRef(eventId), {
    status: "live",
    currentPlayerId: player.id,
    currentPrice: player.basePrice,
    basePrice: player.basePrice,
    currentHighBidTeamId: null,
    currentHighBidderUid: null,
    // Bidding starts closed -- the player is shown, but no one can bid until the organizer opens
    // it with startBidding(), which is also when the countdown (if any) begins.
    biddingOpen: false,
    blockDeadlineAt: null,
    // Starting a new pick retires any pending undo -- reverting a sale from a few players ago
    // while a new one is already on the block would be confusing, not helpful.
    undo: null,
    lastBid: null,
    version: increment(1),
    updatedAt: serverTimestamp(),
    updatedBy: organizerUid,
  });
  await updateDoc(doc(db, "events", eventId, "players", player.id), { status: "on_block" });
}

// Opens the block the organizer just set up for actual bids -- the moment team reps' Bid buttons
// become enabled, and (if a timer is configured) when the countdown actually starts.
export async function startBidding(eventId, organizerUid, bidTimerSeconds = 0) {
  await updateDoc(stateRef(eventId), {
    biddingOpen: true,
    blockDeadlineAt: bidTimerSeconds ? Date.now() + bidTimerSeconds * 1000 : null,
    version: increment(1),
    updatedAt: serverTimestamp(),
    updatedBy: organizerUid,
  });
}

export async function setAuctionStatus(eventId, status, organizerUid) {
  await updateDoc(stateRef(eventId), { status, updatedAt: serverTimestamp(), updatedBy: organizerUid });
}

// Adds `seconds` to whatever time is currently left on the clock -- not a fresh countdown, the
// existing remaining time plus this. FieldValue.increment is atomic server-side, so repeated
// clicks (or two organizer tabs) each land correctly without needing a transaction. No-op target
// doesn't exist if there's no active timer; callers should only show this when blockDeadlineAt is
// already set.
export async function extendBlockTimer(eventId, seconds, organizerUid) {
  await updateDoc(stateRef(eventId), {
    blockDeadlineAt: increment(seconds * 1000),
    updatedAt: serverTimestamp(),
    updatedBy: organizerUid,
  });
}

// Team-rep action -- MUST be a transaction. Two reps tapping "Bid" at the same instant both
// read-then-write the same state doc; Firestore retries the loser against the winner's
// already-committed price, so the second bid is always computed relative to the first and can
// never corrupt or double-count the high bid.
export async function placeBid(eventId, teamId, repUid) {
  const sRef = stateRef(eventId);
  const tRef = doc(db, "events", eventId, "teams", teamId);
  const eRef = doc(db, "events", eventId);

  // Firestore transactions can only tx.get() specific document references, not run a query -- so
  // the full players/teams lists for the roster-quota checks below are read as a plain snapshot
  // just before the transaction starts. These are soft planning constraints, not money-safety
  // critical the way purseRemaining is (that's still re-read transactionally below, same as
  // always); a vanishingly rare race against a concurrent sale/transfer landing in this instant is
  // an acceptable tradeoff for not being able to scan a whole collection atomically.
  const [playersSnap, teamsSnap] = await Promise.all([
    getDocs(collection(db, "events", eventId, "players")),
    getDocs(collection(db, "events", eventId, "teams")),
  ]);
  const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const numTeams = teamsSnap.docs.filter((d) => !d.data().deleted).length;

  return runTransaction(db, async (tx) => {
    const [stateSnap, teamSnap, eventSnap] = await Promise.all([tx.get(sRef), tx.get(tRef), tx.get(eRef)]);
    if (!stateSnap.exists() || !teamSnap.exists()) throw new AppError("NOT_LIVE");

    const state = stateSnap.data();
    const team = teamSnap.data();

    if (state.status !== "live" || !state.currentPlayerId) {
      throw new AppError("NOT_LIVE");
    }
    if (!state.biddingOpen) {
      throw new AppError("BIDDING_NOT_OPEN");
    }
    if (state.currentHighBidTeamId === teamId) {
      throw new AppError("ALREADY_HIGH_BIDDER");
    }

    // Two independent, optional caps -- see auctionQuota.js.
    const currentPlayer = players.find((p) => p.id === state.currentPlayerId);
    const roster = countTeamRoster(players, teamId);

    if (currentPlayer) {
      const genderTotals = computePoolGenderTotals(players);
      const quota = computeGenderQuota(genderTotals[currentPlayer.gender] || 0, numTeams);
      const teamGenderCount = currentPlayer.gender === "female" ? roster.female : roster.male;
      if (isGenderCapped(currentPlayer.gender, teamGenderCount, quota.max)) {
        throw new AppError("GENDER_QUOTA_FULL");
      }
    }

    const proposedPrice = nextIncrement(state.currentPrice, state.incrementLadder);
    if (proposedPrice > team.purseRemaining) {
      throw new AppError("INSUFFICIENT_PURSE");
    }

    const totalSlotsPerTeam = computeTotalSlotsPerTeam(players.length, numTeams);
    const bidCap = maxBidCapForTeam({
      purseRemaining: team.purseRemaining,
      totalSlotsPerTeam,
      teamTotalOwned: roster.total,
      reserveSlotPrice: eventSnap.data()?.reserveSlotPrice,
    });
    if (proposedPrice > bidCap) {
      throw new AppError("EXCEEDS_RESERVE_CAP");
    }

    const bidRef = doc(collection(db, "events", eventId, "bids"));

    tx.update(sRef, {
      currentPrice: proposedPrice,
      currentHighBidTeamId: teamId,
      currentHighBidderUid: repUid,
      // A bid resets the clock, same as a real auctioneer re-starting the count on a new bid.
      ...(state.bidTimerSeconds ? { blockDeadlineAt: Date.now() + state.bidTimerSeconds * 1000 } : {}),
      // Lets this team (and only this team, and only until someone else bids) withdraw this exact
      // bid -- see withdrawBid. Overwritten by the next bid, so only the most recent one is ever
      // reclaimable.
      lastBid: {
        playerId: state.currentPlayerId,
        teamId,
        bidId: bidRef.id,
        previousPrice: state.currentPrice,
        previousHighBidTeamId: state.currentHighBidTeamId,
        previousHighBidderUid: state.currentHighBidderUid,
      },
      version: increment(1),
      updatedAt: serverTimestamp(),
    });

    tx.set(bidRef, {
      playerId: state.currentPlayerId,
      teamId,
      uid: repUid,
      amount: proposedPrice,
      placedAt: serverTimestamp(),
    });
  });
}

// Team-rep action -- lets the team that placed the single most recent bid on the player currently
// on the block take it back, reverting the price and high bidder to whatever they were right
// before that bid. Usable exactly once per team for the whole auction (like the one swap), checked
// transactionally so it can't be bypassed by a stale client. Only the most recent bid is ever
// withdrawable -- once another team bids over it, lastBid points at their bid instead and this
// team's window has closed.
export async function withdrawBid(eventId, teamId) {
  const sRef = stateRef(eventId);
  const tRef = doc(db, "events", eventId, "teams", teamId);

  return runTransaction(db, async (tx) => {
    const [stateSnap, teamSnap] = await Promise.all([tx.get(sRef), tx.get(tRef)]);
    if (!stateSnap.exists() || !teamSnap.exists()) throw new AppError("NOT_LIVE");

    const state = stateSnap.data();
    const team = teamSnap.data();
    const lastBid = state.lastBid;

    if (
      !lastBid ||
      lastBid.playerId !== state.currentPlayerId ||
      lastBid.teamId !== teamId ||
      state.currentHighBidTeamId !== teamId
    ) {
      throw new AppError("NOTHING_TO_WITHDRAW");
    }
    if (team.bidWithdrawUsed) {
      throw new AppError("BID_WITHDRAW_ALREADY_USED");
    }

    tx.update(sRef, {
      currentPrice: lastBid.previousPrice,
      currentHighBidTeamId: lastBid.previousHighBidTeamId,
      currentHighBidderUid: lastBid.previousHighBidderUid,
      lastBid: null,
      version: increment(1),
      updatedAt: serverTimestamp(),
    });
    tx.update(doc(db, "events", eventId, "bids", lastBid.bidId), { withdrawn: true });
    tx.update(tRef, { bidWithdrawUsed: true });
  });
}

// Organizer confirms the sale -- also a transaction, so it re-reads state at commit time. If a
// bid lands a moment before this commits, the transaction retries and sells at the new price;
// there is no window where SOLD and a newer bid can both win against stale data.
export async function confirmSold(eventId, organizerUid) {
  const sRef = stateRef(eventId);

  return runTransaction(db, async (tx) => {
    const stateSnap = await tx.get(sRef);
    const state = stateSnap.data();
    if (!state.currentPlayerId) throw new AppError("NOT_LIVE");

    const playerRef = doc(db, "events", eventId, "players", state.currentPlayerId);

    let undo;
    if (state.currentHighBidTeamId) {
      const teamRef = doc(db, "events", eventId, "teams", state.currentHighBidTeamId);
      const teamSnap = await tx.get(teamRef);
      const team = teamSnap.data();

      tx.update(teamRef, { purseRemaining: team.purseRemaining - state.currentPrice });
      tx.update(playerRef, {
        status: "sold",
        soldTeamId: state.currentHighBidTeamId,
        soldPrice: state.currentPrice,
        soldAt: serverTimestamp(),
      });
      undo = { type: "sold", playerId: state.currentPlayerId, teamId: state.currentHighBidTeamId, price: state.currentPrice };
    } else {
      tx.update(playerRef, { status: "unsold" });
      undo = { type: "unsold", playerId: state.currentPlayerId };
    }

    tx.update(sRef, {
      currentPlayerId: null,
      currentPrice: 0,
      currentHighBidTeamId: null,
      currentHighBidderUid: null,
      biddingOpen: false,
      blockDeadlineAt: null,
      undo,
      lastBid: null,
      version: increment(1),
      updatedAt: serverTimestamp(),
      updatedBy: organizerUid,
    });
  });
}

export async function markUnsold(eventId, organizerUid) {
  const sRef = stateRef(eventId);

  return runTransaction(db, async (tx) => {
    const stateSnap = await tx.get(sRef);
    const state = stateSnap.data();
    if (!state.currentPlayerId) throw new AppError("NOT_LIVE");

    tx.update(doc(db, "events", eventId, "players", state.currentPlayerId), { status: "unsold" });
    tx.update(sRef, {
      currentPlayerId: null,
      currentPrice: 0,
      currentHighBidTeamId: null,
      currentHighBidderUid: null,
      biddingOpen: false,
      blockDeadlineAt: null,
      undo: { type: "unsold", playerId: state.currentPlayerId },
      lastBid: null,
      version: increment(1),
      updatedAt: serverTimestamp(),
      updatedBy: organizerUid,
    });
  });
}

// Reverts the single most recent SOLD/UNSOLD confirmation: the player goes back to the pool, and
// if a team paid for them, the purse is refunded. Only one level of undo is kept -- putting a new
// player on the block (or undoing) clears it, so this can never unwind something from several
// sales ago by accident.
// Returns { reverted: boolean }. `reverted: false` means the undo buffer existed but no longer
// matched reality -- the sale/unsold mark it refers to was since changed by something else (a
// transfer, a manual "return to pool", a completed swap, or the player going back on the block),
// and reverted anyway would either double-refund a team or clobber a different, later outcome.
// Either way the stale buffer is cleared so a second click can't retry the same mistake.
export async function revertLastAction(eventId, organizerUid) {
  const sRef = stateRef(eventId);

  return runTransaction(db, async (tx) => {
    const stateSnap = await tx.get(sRef);
    const state = stateSnap.data();
    const undo = state.undo;
    if (!undo) throw new AppError("NOTHING_TO_UNDO");

    const playerRef = doc(db, "events", eventId, "players", undo.playerId);
    const playerSnap = await tx.get(playerRef);
    const player = playerSnap.exists() ? playerSnap.data() : null;

    const stillValid =
      undo.type === "sold"
        ? Boolean(player && player.status === "sold" && player.soldTeamId === undo.teamId && player.soldPrice === undo.price)
        : Boolean(player && player.status === "unsold");

    if (stillValid) {
      if (undo.type === "sold") {
        const teamRef = doc(db, "events", eventId, "teams", undo.teamId);
        const teamSnap = await tx.get(teamRef);
        const team = teamSnap.data();
        tx.update(teamRef, { purseRemaining: team.purseRemaining + undo.price });
        tx.update(playerRef, { status: "pool", soldTeamId: null, soldPrice: null, soldAt: null });
      } else {
        tx.update(playerRef, { status: "pool" });
      }
    }

    tx.update(sRef, { undo: null, updatedAt: serverTimestamp(), updatedBy: organizerUid });
    return { reverted: stillValid };
  });
}

// Live bid feed for one player -- the audit trail (also usable to settle "who bid first"
// disputes) and the source for the short "recent bids" list shown under the player-on-block card.
export function subscribeToBidsForPlayer(eventId, playerId, callback) {
  const q = query(
    collection(db, "events", eventId, "bids"),
    where("playerId", "==", playerId),
    orderBy("placedAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
