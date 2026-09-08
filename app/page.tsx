import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Landing } from "@/components/landing/Landing";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/fixtures");
  }

  return <Landing />;
}
