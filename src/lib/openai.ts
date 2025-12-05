import OpenAI from 'openai';


export const createOpenAIClient = (apiKey: string, baseURL?: string) => {
    return new OpenAI({
        apiKey,
        baseURL: baseURL || 'https://api.openai.com/v1',
    });
};
