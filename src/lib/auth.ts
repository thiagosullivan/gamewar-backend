import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { emailTemplates, sendWelcomeEmail } from "../utils/emailTemplate.js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL as string,
  secret: process.env.BETTER_AUTH_SECRET as string,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  emailVerification: {
    enabled: true,
    sendOnSignUp: true,
    expiresIn: 60 * 60 * 24, // 24 horas
    callbackURL: process.env.FRONTEND_URL + "/email-verified",

    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendWelcomeEmail(user.email, user.name, url);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    modelName: "userTable",
  },
  session: {
    modelName: "session",
  },
  account: {
    modelName: "account",
  },
  verification: {
    modelName: "verification",
  },
  trustedOrigins: ["http://localhost:3000", "http://localhost:5173"],
});

console.log("✅ Better Auth configurado");
