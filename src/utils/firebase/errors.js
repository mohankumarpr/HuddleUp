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
  NOT_LIVE: "The auction isn't live right now.",
  ALREADY_HIGH_BIDDER: "Your team already holds the highest bid.",
  INSUFFICIENT_PURSE: "Your remaining purse can't cover the next bid increment.",
  INVALID_JOIN_CODE: "That event code doesn't match any live event.",
  INVALID_PIN: "That team PIN is incorrect.",
  NOTHING_TO_UNDO: "There's nothing to undo -- the last sale has already been superseded.",
};

export function friendlyErrorMessage(err) {
  const code = err?.code || err?.message;
  return FRIENDLY_MESSAGES[code] || "Something went wrong. Please try again.";
}
