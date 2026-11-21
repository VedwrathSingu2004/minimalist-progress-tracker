import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import db from "@/db"
import * as schema from "@/db/schema"

export const auth = betterAuth({
  session: {
    expiresIn: Number(process.env.BETTER_AUTH_SESSION_EXPIRY) // in days
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    disableSignUp: true
  },
  // socialProviders: {
  //   github: {
  //     clientId: process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  //   },
  // },
})