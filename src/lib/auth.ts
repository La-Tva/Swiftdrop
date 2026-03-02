import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { clientPromise, getCollections } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: MongoDBAdapter(clientPromise, { databaseName: "swiftdrop" }),
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const { users } = await getCollections();
                const user = await users.findOne({ email: (credentials.email as string).toLowerCase() });
                if (!user || !user.passwordHash) return null;
                const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
                if (!valid) return null;
                return { id: user._id.toString(), email: user.email, name: user.name ?? null };
            },
        }),
    ],
    secret: process.env.AUTH_SECRET,
});
