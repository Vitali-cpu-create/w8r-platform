import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import CreditFoundry from "./credit-foundry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "C.R.E.D.I.T Project Foundry — W8R",
  description: "Turn an entrepreneurial idea into a governed, evidence-labelled and testable product blueprint without an external AI provider.",
};

export default async function CreditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getChatGPTUser();
  const params = await searchParams;
  const requestedPilot = typeof params.pilotSession === "string" ? params.pilotSession : null;
  const pilotSessionId = requestedPilot && /^[a-zA-Z0-9:_-]{1,120}$/.test(requestedPilot) ? requestedPilot : null;
  return <CreditFoundry viewer={{
    displayName: user?.displayName ?? "Founder sandbox",
    authenticated: Boolean(user),
  }} initialPilotSessionId={pilotSessionId} />;
}
