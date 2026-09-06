import { getChatGPTUser } from "./chatgpt-auth";
import W8RPlatform from "./w8r-platform";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getChatGPTUser();
  return <W8RPlatform viewer={user ? {
    displayName: user.displayName,
    email: user.email,
    authenticated: true,
  } : {
    displayName: "Investor sandbox",
    email: null,
    authenticated: false,
  }} />;
}
