import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Landing } from "@/components/landing/Landing";
import { getPrizeSettings } from "@/lib/prizes";
import { getActiveCompetition } from "@/lib/competition";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/fixtures");
  }

  return <Landing prizes={await getPrizeSettings()} seasonName={getActiveCompetition().name} />;
}
