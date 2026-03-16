'use server'

import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// 临时存储验证码（生产环境应使用 Redis）
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

/**
 * 发送验证码
 */
export async function sendVerificationCode(email: string) {
  try {
    if (!email || !email.includes("@")) {
      return { error: "Invalid email address" };
    }

    // 生成 6 位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 设置 3 分钟过期
    const expiresAt = Date.now() + 3 * 60 * 1000;
    
    // 存储验证码
    verificationCodes.set(email, { code, expiresAt });
    
    // 暂时使用 console.log 输出验证码
    console.log(`[Verification Code] Email: ${email}, Code: ${code}`);
    
    return { success: true };
  } catch (error) {
    console.error("Send verification code error:", error);
    return { error: "Failed to send verification code" };
  }
}

/**
 * 验证验证码
 */
function verifyCode(email: string, code: string): boolean {
  const stored = verificationCodes.get(email);
  
  if (!stored) {
    return false;
  }
  
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return false;
  }
  
  if (stored.code !== code) {
    return false;
  }
  
  // 验证成功后删除验证码
  verificationCodes.delete(email);
  return true;
}

/**
 * 用户注册
 */
export async function registerAction(prevState: any, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const code = formData.get("code") as string;

    // 验证输入
    if (!name || !email || !password || !code) {
      return { error: "All fields are required" };
    }

    if (password.length < 6) {
      return { error: "Password must be at least 6 characters" };
    }

    // 验证验证码
    if (!verifyCode(email, code)) {
      return { error: "Invalid or expired verification code" };
    }

    // 检查用户是否已存在
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (existingUser) {
      return { error: "Email already registered" };
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    await db.insert(user).values({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("Register error:", error);
    return { error: "Registration failed" };
  }
}

/**
 * 用户登录
 */
export async function loginAction(prevState: any, formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    // 查找用户
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!existingUser) {
      return { error: "Invalid email or password" };
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, existingUser.password);

    if (!isValidPassword) {
      return { error: "Invalid email or password" };
    }

    // 返回成功，客户端将处理登录
    return { 
      success: true,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      }
    };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Login failed" };
  }
}
