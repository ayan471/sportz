import { MATCH_STATUS } from "../validation/matches.js";

/**
 * Determine a match's status from start and end times relative to a reference time.
 *
 * @param {string|number|Date} startTime - Value parseable by `Date` representing the match start.
 * @param {string|number|Date} endTime - Value parseable by `Date` representing the match end.
 * @param {Date} [now=new Date()] - Reference time to evaluate the status against.
 * @returns {('SCHEDULED'|'LIVE'|'FINISHED')|null} One of `MATCH_STATUS.SCHEDULED`, `MATCH_STATUS.LIVE`, or `MATCH_STATUS.FINISHED`; returns `null` if `startTime` or `endTime` is not a valid date.
 */
export function getMatchStatus(startTime, endTime, now = new Date()) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
}

/**
 * Synchronizes a match object's status with the status computed from its start and end times.
 * @param {Object} match - Match object containing scheduling and current status.
 * @param {string|Date|number} match.startTime - Match start time (ISO string, Date, or timestamp).
 * @param {string|Date|number} match.endTime - Match end time (ISO string, Date, or timestamp).
 * @param {string} match.status - Current match status.
 * @param {(newStatus: string) => Promise<*>} updateStatus - Async callback invoked with the new status when a change is required.
 * @returns {string} The match's current status (`MATCH_STATUS` value) after synchronization.
 */
export async function syncMatchStatus(match, updateStatus) {
  const nextStatus = getMatchStatus(match.startTime, match.endTime);
  if (!nextStatus) {
    return match.status;
  }
  if (match.status !== nextStatus) {
    await updateStatus(nextStatus);
    match.status = nextStatus;
  }
  return match.status;
}