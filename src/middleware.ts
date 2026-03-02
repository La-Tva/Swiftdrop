import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
    // Only target the main routes for protection
    matcher: ["/main/:path*", "/dashboard/:path*", "/profile/:path*"],
};
