import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";

export const authOptions = {
	providers: [
		EmailProvider({
			server: process.env.EMAIL_SERVER,
			from: process.env.EMAIL_FROM,
			maxAge: 24 * 60 * 60,
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	session: {
		strategy: "jwt",
	},
	adapter: undefined,
	pages: {
		signIn: "/login",
	},
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
