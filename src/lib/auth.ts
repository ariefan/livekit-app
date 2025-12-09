import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Helper to check if a string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Check if user exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email!),
        });

        if (!existingUser) {
          // Create new user
          const newUser = await db.insert(users).values({
            id: uuidv4(),
            email: user.email!,
            name: user.name,
            image: user.image,
            emailVerified: new Date(),
          }).returning();

          // Link account
          await db.insert(accounts).values({
            id: uuidv4(),
            userId: newUser[0].id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
            tokenType: account.token_type,
            scope: account.scope,
            idToken: account.id_token,
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // On initial sign-in, user object is available
      if (user) {
        // For OAuth providers, look up the database UUID by email
        if (account?.provider === "google" && user.email) {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });
          if (dbUser) {
            token.id = dbUser.id;
          }
        } else {
          // For credentials provider, user.id is already our UUID
          token.id = user.id;
        }
      }
      
      // On subsequent requests, if token.id is not a valid UUID, look it up
      if (token.id && !isUUID(token.id as string) && token.email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, token.email as string),
        });
        if (dbUser) {
          token.id = dbUser.id;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
};
