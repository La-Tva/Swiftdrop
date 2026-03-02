import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no Node.js modules (no bcrypt, no MongoDB)
// Used by middleware only
export const authConfig = {
    pages: { signIn: "/", error: "/" },
    session: { strategy: "jwt" as const },
    callbacks: {
        authorized({ auth, request }: { auth: { user?: unknown } | null; request: { nextUrl: URL } }) {
            const isLoggedIn = !!auth?.user;
            const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
            if (isDashboard && !isLoggedIn) return false;
            return true;
        },
        jwt({ token, user }: { token: Record<string, unknown>; user?: { id?: string } }) {
            if (user?.id) token.id = user.id;
            return token;
        },
        session({ session, token }: { session: { user: { id?: string } }; token: Record<string, unknown> }) {
            if (token?.id) session.user.id = token.id as string;
            return session;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
