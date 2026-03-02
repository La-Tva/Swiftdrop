import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware uses only the edge-safe config (no bcrypt, no MongoDB)
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
    matcher: ["/dashboard/:path*"],
};
