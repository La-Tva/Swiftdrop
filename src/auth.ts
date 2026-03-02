import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { getCollections } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const { users } = await getCollections();
                const user = await users.findOne({ email: credentials.email as string });

                if (!user || !user.passwordHash) return null;

                const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
                if (!isValid) return null;

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                };
            },
        }),
    ],
});
