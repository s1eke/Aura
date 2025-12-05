import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('请输入邮箱和密码');
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user) {
                    throw new Error('用户不存在');
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error('密码错误');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.username,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }

            // Always fetch fresh user data from DB to ensure sync across devices
            // This ensures status updates are immediately visible after page refresh
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        avatar: true,
                        myBubbleBackground: true,
                        myBubbleBorder: true,
                        myBubbleText: true,
                        otherBubbleBackground: true,
                        otherBubbleBorder: true,
                        otherBubbleText: true,
                        statusIcon: true,
                        apiBaseUrl: true,
                        apiKey: true,
                        llmModel: true,
                        visionModel: true
                    }
                });

                if (dbUser) {
                    token.name = dbUser.username;
                    token.picture = dbUser.avatar;
                    token.myBubbleBackground = dbUser.myBubbleBackground;
                    token.myBubbleBorder = dbUser.myBubbleBorder;
                    token.myBubbleText = dbUser.myBubbleText;
                    token.otherBubbleBackground = dbUser.otherBubbleBackground;
                    token.otherBubbleBorder = dbUser.otherBubbleBorder;
                    token.otherBubbleText = dbUser.otherBubbleText;
                    token.statusIcon = dbUser.statusIcon;
                    token.apiBaseUrl = dbUser.apiBaseUrl;
                    // Mask API key for security - use placeholder instead of actual key
                    token.apiKey = dbUser.apiKey ? '••••••••••••••••' : null;
                    token.llmModel = dbUser.llmModel;
                    token.visionModel = dbUser.visionModel;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.name = token.name;
                session.user.image = token.picture;
                session.user.myBubbleBackground = token.myBubbleBackground;
                session.user.myBubbleBorder = token.myBubbleBorder;
                session.user.myBubbleText = token.myBubbleText;
                session.user.otherBubbleBackground = token.otherBubbleBackground;
                session.user.otherBubbleBorder = token.otherBubbleBorder;
                session.user.otherBubbleText = token.otherBubbleText;
                session.user.statusIcon = token.statusIcon;
                session.user.apiBaseUrl = token.apiBaseUrl;
                session.user.apiKey = token.apiKey;
                session.user.llmModel = token.llmModel;
                session.user.visionModel = token.visionModel;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
