import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { subscribeToAuctionState } from "../../utils/firebase/auctionRealtime";
import { subscribeToPlayers } from "../../utils/firebase/players";
import { subscribeToTeams } from "../../utils/firebase/events";
import { playBidSound, playSoldSound, useSoundEnabled } from "../../utils/sound";

// Shared real-time data source for the organizer console, team bidder view, and public
// spectator view -- all three render purely from this hook's snapshot, never from local
// optimistic state, so everyone always sees the same authoritative numbers.
export function useAuctionRoom(eventId) {
  const [state, setState] = useState(undefined); // undefined = loading, null = no auction yet
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const soldSeenRef = useRef(null);
  const lastPriceRef = useRef(null);
  const [soundEnabled, toggleSound] = useSoundEnabled();

  useEffect(() => {
    if (!eventId) return undefined;
    const unsubState = subscribeToAuctionState(eventId, setState);
    const unsubPlayers = subscribeToPlayers(eventId, setPlayers);
    const unsubTeams = subscribeToTeams(eventId, setTeams);
    return () => {
      unsubState();
      unsubPlayers();
      unsubTeams();
    };
  }, [eventId]);

  // Fire confetti + a sound once per newly-sold player. Seed silently on the first snapshot so
  // opening the room after a bunch of players are already sold doesn't trigger a confetti storm.
  useEffect(() => {
    const soldIds = new Set(players.filter((p) => p.status === "sold").map((p) => p.id));
    if (soldSeenRef.current === null) {
      soldSeenRef.current = soldIds;
      return;
    }
    for (const id of soldIds) {
      if (!soldSeenRef.current.has(id)) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        if (soundEnabled) playSoldSound();
      }
    }
    soldSeenRef.current = soldIds;
  }, [players, soundEnabled]);

  // A short blip on every price rise for the player currently on the block. Keyed off
  // currentPlayerId + currentPrice together so switching to a new player (whose price resets to
  // its own base price) never misreads as a bid.
  useEffect(() => {
    if (!state?.currentPlayerId) {
      lastPriceRef.current = null;
      return;
    }
    const key = `${state.currentPlayerId}:${state.currentPrice}`;
    if (lastPriceRef.current !== null && lastPriceRef.current !== key && lastPriceRef.current.split(":")[0] === state.currentPlayerId) {
      if (soundEnabled) playBidSound();
    }
    lastPriceRef.current = key;
  }, [state?.currentPlayerId, state?.currentPrice, soundEnabled]);

  const currentPlayer = state?.currentPlayerId ? players.find((p) => p.id === state.currentPlayerId) : null;
  const highBidTeam = state?.currentHighBidTeamId ? teams.find((t) => t.id === state.currentHighBidTeamId) : null;
  const poolPlayers = players.filter((p) => p.status === "pool");

  return {
    loading: state === undefined,
    state: state || null,
    players,
    teams,
    currentPlayer,
    highBidTeam,
    poolPlayers,
    soundEnabled,
    toggleSound,
  };
}
