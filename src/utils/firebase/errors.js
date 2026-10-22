export class AppError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

const FRIENDLY_MESSAGES = {
  "auth/email-already-in-use": "An account with that email already exists.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/missing-password": "Please enter your password.",
  "permission-denied": "You don't have permission to do that.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/weak-password": "Choose a password with at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/invalid-action-code": "This reset link is invalid or has already been used. Request a new one.",
  "auth/expired-action-code": "This reset link has expired. Request a new one.",
  NOT_LIVE: "The auction isn't live right now.",
  BIDDING_NOT_OPEN: "The organizer hasn't started bidding for this player yet.",
  GENDER_QUOTA_FULL: "Your team already has its maximum number of players of this gender.",
  EXCEEDS_RESERVE_CAP: "That bid would leave too little purse to cover the reserve price for your remaining squad slots.",
  ALREADY_HIGH_BIDDER: "Your team already holds the highest bid.",
  INSUFFICIENT_PURSE: "Your remaining purse can't cover the next bid increment.",
  INVALID_JOIN_CODE: "That event code doesn't match any live event.",
  INVALID_PIN: "That team PIN is incorrect.",
  NOTHING_TO_UNDO: "There's nothing to undo -- the last sale has already been superseded.",
  INVITE_NOT_FOUND: "This invite link is no longer valid -- it may have been revoked or already used.",
  INVITE_EMAIL_MISMATCH: "This invite was sent to a different email address. Sign in or sign up with that email to accept it.",
  ALREADY_IN_ANOTHER_ORG: "This account already belongs to a different organization. Accept this invite with a different email instead.",
  TEAM_HAS_SOLD_PLAYERS: "This team has already bought players in the auction and can't be deleted. Unsell those players first if you need to remove the team.",
  PLAYER_NOT_REMOVABLE: "This player is sold or currently on the auction block and can't be removed. Undo the sale from the auction console first if needed.",
  PLAYER_NOT_SOLD: "This player isn't currently sold to a team.",
  SAME_TEAM: "This player is already on that team.",
  TEAM_NOT_FOUND: "Couldn't find one of the teams involved.",
  TRANSFER_INSUFFICIENT_PURSE: "That team's remaining purse can't cover this player's price.",
  SWAP_ALREADY_USED: "This team has already used its one swap for this auction.",
  SWAP_NOT_ACCEPTED: "This swap hasn't been accepted by the other team yet.",
  SWAP_PLAYER_NOT_AVAILABLE: "This player isn't available for that team to swap anymore -- they may have already been moved.",
  NOTHING_TO_WITHDRAW: "There's no bid of yours left to withdraw -- you may have been outbid, or the player has moved on.",
  BID_WITHDRAW_ALREADY_USED: "You've already used your one bid withdrawal for this auction.",
};

export function friendlyErrorMessage(err) {
  const code = err?.code || err?.message;
  return FRIENDLY_MESSAGES[code] || "Something went wrong. Please try again.";
}
