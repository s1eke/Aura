import OpenAI from 'openai';
import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Summarize chat messages for memory enhancement
 * @param client Initialized OpenAI client
 * @param newMessagesText Text of new messages to summarize
 * @param previousMemory Previous memory summary (if exists)
 * @param model Model to use
 * @returns Summary content
 */
export async function summarizeChatMemory(
    client: OpenAI,
    newMessagesText: string,
    previousMemory?: string,
    model: string = 'gpt-4o-mini'
): Promise<string> {
    if (!newMessagesText && !previousMemory) {
        return '';
    }

    // Create summarization prompt
    let prompt = '';
    if (previousMemory) {
        prompt = `你是一个记忆整理助手。请仔细分析以下对话，生成准确的记忆摘要。

【历史记忆】
${previousMemory}

【最新对话】
${newMessagesText}

【任务要求】
1. **仔细阅读全部对话**：从头到尾完整分析对话内容，理解上下文
2. **严格区分事实来源**：
   - "用户"：仅记录用户明确说过的内容
   - "你"：仅记录AI（你自己）明确说过的内容
   - 绝对不要把你说的话归到用户头上
   - 绝对不要编造对话中没有出现的信息
3. **整合历史记忆**：保留历史记忆中仍然重要的信息
4. **极简原则**：
   - 只保留最核心的事实，去除所有冗余
   - 用最少的字数表达完整信息
   - 避免重复，避免解释性文字
   - 直接列出要点，不要展开描述
   - **合并同类信息**：将所有用户相关信息合并到一行，所有你的信息合并到一行

【记忆重点】
- 用户的真实信息（姓名、职业、爱好、习惯等）
- 用户提到的真实事件和计划
- 关键话题和上下文
- 你（AI角色）的设定和特征

【严格禁止】
❌ 不要编造对话中没有的信息
❌ 不要混淆谁说了什么
❌ 不要推测或猜测
❌ 不要写多余的解释和描述
❌ 不要重复表达同一个意思

【输出格式】（重要：只用2行总结所有信息）
- 用户：[所有用户相关信息用逗号或顿号连接，如：叫john，工程师，喜欢咖啡，问过标点符号用法]
- 你：[所有你的相关信息用逗号或顿号连接，如：角色名3，上班摸鱼，收藏表情包，熟悉标点符号]

生成整合后的记忆：`;
    } else {
        prompt = `你是一个记忆整理助手。请仔细分析以下对话，生成准确的记忆摘要。

【对话内容】
${newMessagesText}

【任务要求】
1. **仔细阅读全部对话**：从头到尾完整分析对话内容，理解上下文
2. **严格区分事实来源**：
   - "用户"：仅记录用户明确说过的内容
   - "你"：仅记录AI（你自己）明确说过的内容
   - 绝对不要把你说的话归到用户头上
   - 绝对不要编造对话中没有出现的信息
3. **极简原则**：
   - 只保留最核心的事实，去除所有冗余
   - 用最少的字数表达完整信息
   - 避免重复，避免解释性文字
   - 直接列出要点，不要展开描述
   - **合并同类信息**：将所有用户相关信息合并到一行，所有你的信息合并到一行

【记忆重点】
- 用户的真实信息（姓名、职业、爱好、习惯等）
- 用户提到的真实事件和计划
- 关键话题和上下文
- 你（AI角色）的设定和特征

【严格禁止】
❌ 不要编造对话中没有的信息
❌ 不要混淆谁说了什么
❌ 不要推测或猜测
❌ 不要写多余的解释和描述
❌ 不要重复表达同一个意思

【输出格式】（重要：只用2行总结所有信息）
- 用户：[所有用户相关信息用逗号或顿号连接，如：叫john，工程师，喜欢咖啡，问过标点符号用法]
- 你：[所有你的相关信息用逗号或顿号连接，如：角色名3，上班摸鱼，收藏表情包，熟悉标点符号]

生成记忆：`;
    }

    logger.debug('\n========== Memory Summarization Debug ==========');
    logger.debug('[Input] Model:', model);
    logger.debug('[Input] Temperature:', 0.5);
    logger.debug('[Input] Has Previous Memory:', !!previousMemory);
    if (previousMemory) {
        logger.debug('[Input] Previous Memory:', previousMemory);
    }
    logger.debug('[Input] New Messages Text Length:', newMessagesText.length);
    logger.debug('[Input] Complete Prompt:');
    logger.debug('---');
    logger.debug(prompt);
    logger.debug('---');

    // Call OpenAI for summarization
    const completion = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.5, // Lower temperature for more consistent modification
    });

    const summary = completion.choices[0]?.message?.content || '';

    logger.debug('[Output] Summary Result:');
    logger.debug('---');
    logger.debug(summary.trim());
    logger.debug('---');
    logger.debug('================================================\n');

    return summary.trim();
}

/**
 * Create or update memory for a session (Rolling Update)
 * @param client Initialized OpenAI client
 * @param sessionId Session ID
 * @param model Model to use
 * @returns Created SessionMemory
 */
export async function createSessionMemory(
    client: OpenAI,
    sessionId: string,
    model?: string
) {
    // 1. Get the single latest memory (we only keep one now)
    const previousMemories = await prisma.sessionMemory.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: 1,
    });

    const lastMemory = previousMemories[0];
    const previousMemoryContent = lastMemory?.content || '';

    // 2. Find the last 30 messages (regardless of when last memory was created)
    // This ensures we always use a consistent context window
    const newMessages = await prisma.message.findMany({
        where: {
            sessionId,
            isDeleted: false,
        },
        orderBy: {
            createdAt: 'desc', // Get newest first
        },
        take: 30, // Always take last 30 messages
    });

    if (newMessages.length === 0) {
        // Nothing to summarize
        return lastMemory || null;
    }

    // Reverse to get chronological order for summarization
    newMessages.reverse();

    // Format new messages
    const messageText = newMessages
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');

    logger.info(`[Memory] Summarizing ${newMessages.length} new messages...`);

    // 3. Generate new merged summary
    const summary = await summarizeChatMemory(client, messageText, previousMemoryContent, model);

    if (!summary) {
        throw new Error('Failed to generate memory summary');
    }

    // 4. Create new memory record
    const memory = await prisma.sessionMemory.create({
        data: {
            sessionId,
            content: summary,
            messageCount: newMessages.length, // Count of NEW messages absorbed
        },
    });

    // 5. Delete OLD memory (Overwrite strategy)
    if (lastMemory) {
        await prisma.sessionMemory.delete({
            where: { id: lastMemory.id },
        });
    }

    return memory;
}

/**
 * Get recent memories for a session
 * @param sessionId Session ID
 * @param limit Max number of memories to fetch
 * @returns Array of memories
 */
export async function getSessionMemories(sessionId: string, limit: number = 1) {
    // With rolling memory, we typically only have 1, but we keep the signature valid.
    return await prisma.sessionMemory.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

/**
 * Check if summarization should be triggered
 * @param sessionId Session ID
 * @returns True if should summarize
 */
export async function shouldTriggerSummarization(sessionId: string): Promise<boolean> {
    // Get last memory
    const lastMemory = await prisma.sessionMemory.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
    });

    if (!lastMemory) {
        // If no memory, check total count
        const totalMessages = await prisma.message.count({
            where: { sessionId, isDeleted: false },
        });
        return totalMessages >= 30;
    }

    // If memory exists, check count since then
    const messagesAfterLastMemory = await prisma.message.count({
        where: {
            sessionId,
            isDeleted: false,
            createdAt: {
                gt: lastMemory.createdAt,
            },
        },
    });

    return messagesAfterLastMemory >= 30;
}
