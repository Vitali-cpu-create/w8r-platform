import type { Metadata } from "next";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import CreditFoundry from "./credit-foundry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "C.R.E.D.I.T Project Foundry — W8R",
  description: "Turn an entrepreneurial idea into a governed, evidence-labelled and testable product blueprint without an external AI provider.",
};

export default async function CreditPage() {
  const user = await getChatGPTUser();
  return <CreditFoundry viewer={{
    displayName: user?.displayName ?? "Founder sandbox",
    authenticated: Boolean(user),
  }} />;
}
