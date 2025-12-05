const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Try to load .env file if it exists, but don't crash if it doesn't
try {
    require('dotenv').config();
} catch (e) {
    // .env might not exist in production if vars are injected via environment
}

/**
 * User Registration Script (Production Request)
 * 
 * Usage:
 *   node scripts/create-user.js --email user@example.com --username john --password securepass123
 */

// Initialize Prisma with Adapter (matching src/lib/prisma.ts)
// This is required because the Prisma Client was generated with adapter support
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

function parseArgs() {
    const args = process.argv.slice(2);
    const result = {};

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--email' && i + 1 < args.length) {
            result.email = args[i + 1];
            i++;
        } else if (args[i] === '--username' && i + 1 < args.length) {
            result.username = args[i + 1];
            i++;
        } else if (args[i] === '--password' && i + 1 < args.length) {
            result.password = args[i + 1];
            i++;
        }
    }

    if (!result.email || !result.username || !result.password) {
        return null;
    }

    return result;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    if (password.length < 6) {
        return { valid: false, message: '密码长度至少为 6 个字符' };
    }
    return { valid: true };
}

function validateUsername(username) {
    if (username.length < 2) {
        return { valid: false, message: '用户名长度至少为 2 个字符' };
    }
    if (username.length > 50) {
        return { valid: false, message: '用户名长度不能超过 50 个字符' };
    }
    // Allow letters, numbers, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return { valid: false, message: '用户名只能包含字母、数字、下划线和连字符' };
    }
    return { valid: true };
}

async function createUser(args) {
    try {
        // Validate email format
        if (!validateEmail(args.email)) {
            console.error('❌ 错误: 邮箱格式无效');
            process.exit(1);
        }

        // Validate username
        const usernameValidation = validateUsername(args.username);
        if (!usernameValidation.valid) {
            console.error(`❌ 错误: ${usernameValidation.message}`);
            process.exit(1);
        }

        // Validate password
        const passwordValidation = validatePassword(args.password);
        if (!passwordValidation.valid) {
            console.error(`❌ 错误: ${passwordValidation.message}`);
            process.exit(1);
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: args.email },
                    { username: args.username },
                ],
            },
        });

        if (existingUser) {
            if (existingUser.email === args.email) {
                console.error('❌ 错误: 该邮箱已被注册');
            } else {
                console.error('❌ 错误: 该用户名已被使用');
            }
            process.exit(1);
        }

        // Hash password
        console.log('🔐 正在加密密码...');
        const hashedPassword = await bcrypt.hash(args.password, 10);

        // Create user
        console.log('📝 正在创建用户...');
        const user = await prisma.user.create({
            data: {
                email: args.email,
                username: args.username,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true,
            },
        });

        console.log('\n✅ 用户创建成功！');
        console.log('━'.repeat(50));
        console.log(`用户 ID:  ${user.id}`);
        console.log(`邮箱:     ${user.email}`);
        console.log(`用户名:   ${user.username}`);
        console.log(`创建时间: ${user.createdAt.toLocaleString('zh-CN')}`);
        console.log('━'.repeat(50));
        console.log('\n💡 提示: 用户现在可以使用邮箱和密码登录系统');

    } catch (error) {
        console.error('\n❌ 创建用户失败:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    console.log('\n🚀 Aura 用户注册脚本 (Production)\n');

    const args = parseArgs();

    if (!args) {
        console.error('❌ 错误: 缺少必需参数\n');
        console.log('用法:');
        console.log('  node scripts/create-user.js --email <邮箱> --username <用户名> --password <密码>\n');
        process.exit(1);
    }

    await createUser(args);
}

main();
