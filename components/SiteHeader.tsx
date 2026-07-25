import { auth } from "@/lib/auth";
import { ProfileMenu } from "@/components/ProfileMenu";
import { BottomNav } from "@/components/BottomNav";
import { SiteNavLinks } from "@/components/SiteNavLinks";
import { DailyRewardClaim } from "@/components/DailyRewardClaim";
import { getFeatureFlags, effectiveFlags } from "@/lib/feature-flags";

export async function SiteHeader() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const flags = effectiveFlags(await getFeatureFlags(), session.user.role);

  return (
    <>
      <header className="gradient-header flex items-center justify-between gap-2 px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight">🏆 Bettman</span>
          <SiteNavLinks
            flags={{
              navFixtures: flags.navFixtures,
              navMyPredictions: flags.navMyPredictions,
              navLeaderboard: flags.navLeaderboard,
              rewardsPage: flags.rewardsPage,
            }}
            isAdmin={session.user.role === "ADMIN"}
          />
        </div>

        <div className="flex items-center gap-4">
          {flags.dailyRewardClaim && <DailyRewardClaim />}
          <ProfileMenu name={session.user.name ?? "?"} avatarUrl={session.user.avatarUrl} />
        </div>
      </header>

      <BottomNav
        isAdmin={session.user.role === "ADMIN"}
        visible={{
          fixtures: flags.navFixtures,
          myPredictions: flags.navMyPredictions,
          leaderboard: flags.navLeaderboard,
          rewards: flags.rewardsPage,
        }}
      />
    </>
  );
}
