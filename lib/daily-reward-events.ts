// The daily reward can be claimed from the popup, the header or the rewards
// page, each with its own state. A claim anywhere fires this window event so
// the others (notably the header's Claim button) update without a reload.
export const DAILY_REWARD_CLAIMED_EVENT = "daily-reward-claimed";

export type DailyRewardClaimedDetail = {
  /** Coins added by this claim; 0 when the server says it was already claimed. */
  awarded: number;
};

export function announceDailyRewardClaimed(awarded: number) {
  window.dispatchEvent(
    new CustomEvent<DailyRewardClaimedDetail>(DAILY_REWARD_CLAIMED_EVENT, { detail: { awarded } })
  );
}
