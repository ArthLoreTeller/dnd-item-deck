export function isDiscardNotification(message, discarded) {
  if (!discarded) return false;
  return message === `Returned "${discarded.name}" to the deck.` || message === `Moved "${discarded.name}" to recovery.`;
}
