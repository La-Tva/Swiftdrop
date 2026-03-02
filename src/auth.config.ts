import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no Node.js modules (no bcrypt, no MongoDB)
// Used by middleware only
export const authConfig = {
    pages: { signIn: "/", error: "/" },
    session: { strategy: "jwt" as const },
    callbacks: {
        authorized({ auth, request }) {
            const isLoggedIn = !!auth?.user;
            const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
            if (isDashboard && !isLoggedIn) return false;
            return true;
        },
        jwt({ token, user }) {
            if (user?.id) {
                token.id = user.id;
            }
            return token;
        },
        session({ session, token }) {
            if (token?.id && session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
