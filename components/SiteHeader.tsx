import { auth } from "@/lib/auth";
import { ProfileMenu } from "@/components/ProfileMenu";
import { BottomNav } from "@/components/BottomNav";
import { SiteNavLinks } from "@/components/SiteNavLinks";
import { DailyRewardClaim } from "@/components/DailyRewardClaim";
import { InstallButton } from "@/components/InstallButton";
import { BrandLogo } from "@/components/BrandLogo";
import { getFeatureFlags, effectiveFlags } from "@/lib/feature-flags";

export async function SiteHeader() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const flags = effectiveFlags(await getFeatureFlags(), session.user.role);

  return (
    <>
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 flex items-center justify-between gap-2 border-b border-white/[0.06] bg-background/90 px-4 py-3 text-white backdrop-blur">
        <div className="flex min-w-0 items-center gap-5">
          <BrandLogo />
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <InstallButton className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.08] p-2.5 text-xs font-semibold text-white transition hover:bg-white/15 sm:px-3.5" />
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
