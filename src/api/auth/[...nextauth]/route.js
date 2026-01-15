import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";

export const authOptions = {
	providers: [
		EmailProvider({
			server: process.env.EMAIL_SERVER,
			from: process.env.EMAIL_FROM,
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	pages: {
		signIn: "/portal-login",
	},
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
