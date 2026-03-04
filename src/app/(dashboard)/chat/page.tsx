import { auth } from "@/auth";
import { ChatClient } from "./ChatClient";
import { redirect } from "next/navigation";

export default async function GlobalChatPage() {
  const session = await auth();

  if (!session?.user || !session.user.id) {
    redirect("/login");
  }

  return (
    <div className="flex-1 h-full w-full p-6">
      <ChatClient
        spaceId="global"
        userId={session.user.id}
        userName={session.user.name || "Utilisateur"}
      />
    </div>
  );
}
