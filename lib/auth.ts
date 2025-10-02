import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Configure Supabase provider here
    // You'll need to add the actual provider configuration after installing packages
    {
      id: "supabase",
      name: "Supabase",
      type: "oauth",
      wellKnown: `${process.env.SUPABASE_URL}/auth/v1/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid email" } },
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      clientId: process.env.SUPABASE_CLIENT_ID,
      clientSecret: process.env.SUPABASE_CLIENT_SECRET,
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
      }
      return session
    },
  },
}
