import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware uses only the edge-safe config (no bcrypt, no MongoDB)
const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
    matcher: ["/dashboard/:path*"],
};
