import type { Metadata } from "next";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import PilotOperations from "./pilot-operations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "C.R.E.D.I.T Pilot Evidence Room — W8R",
  description: "Operate the private Project Foundry pilot and evaluate the Day-30 evidence gates.",
};

export default async function PilotOperationsPage() {
  const user = await getChatGPTUser();
  return <PilotOperations viewer={{
    authenticated: Boolean(user),
    displayName: user?.displayName ?? "Pilot operator",
    signInPath: chatGPTSignInPath("/credit/ops"),
  }} />;
}
