import type { Metadata } from "next";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import PilotJourney from "./pilot-journey";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "C.R.E.D.I.T Founder Pilot — W8R",
  description: "Complete the private ten-minute Project Foundry evidence pilot.",
};

export default async function PilotPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getChatGPTUser();
  const params = await searchParams;
  const code = typeof params.code === "string" && /^[a-zA-Z0-9-]{6,40}$/.test(params.code) ? params.code : "";
  const sessionId = typeof params.session === "string" && /^[a-zA-Z0-9:_-]{1,120}$/.test(params.session) ? params.session : null;
  const returnTo = sessionId ? `/credit/pilot?session=${encodeURIComponent(sessionId)}` : code ? `/credit/pilot?code=${encodeURIComponent(code)}` : "/credit/pilot";
  return <PilotJourney viewer={{
    authenticated: Boolean(user),
    displayName: user?.displayName ?? "Pilot participant",
    signInPath: chatGPTSignInPath(returnTo),
  }} initialCode={code} initialSessionId={sessionId} />;
}
