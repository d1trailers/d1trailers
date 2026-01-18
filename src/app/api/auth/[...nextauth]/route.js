import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "../../lib/prisma";

export const authOptions = {
	providers: [
		EmailProvider({
			server: process.env.EMAIL_SERVER,
			from: process.env.EMAIL_FROM,
			maxAge: 24 * 60 * 60,
		}),
	],
	adapter: PrismaAdapter(prisma),
	secret: process.env.NEXTAUTH_SECRET,
	session: {
		strategy: "database",
	},
	pages: {
		signIn: "/login",
	},
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
