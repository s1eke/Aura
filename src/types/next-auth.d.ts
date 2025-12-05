import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            username: string
            // Bubble Settings
            myBubbleBackground?: string | null
            myBubbleBorder?: string | null
            myBubbleText?: string | null
            otherBubbleBackground?: string | null
            otherBubbleBorder?: string | null
            otherBubbleText?: string | null
            statusIcon?: string | null

            // API Settings
            apiBaseUrl?: string | null
            apiKey?: string | null
            llmModel?: string | null
            visionModel?: string | null
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        name?: string | null
        email?: string | null
        picture?: string | null

        // Bubble Settings
        myBubbleBackground?: string | null
        myBubbleBorder?: string | null
        myBubbleText?: string | null
        otherBubbleBackground?: string | null
        otherBubbleBorder?: string | null
        otherBubbleText?: string | null
        statusIcon?: string | null

        // API Settings
        apiBaseUrl?: string | null
        apiKey?: string | null
        llmModel?: string | null
        visionModel?: string | null
    }
}
