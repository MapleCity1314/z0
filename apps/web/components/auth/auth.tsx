"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, User, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useFormStatus } from "react-dom";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendVerificationCode, registerAction, loginAction } from "./actions";
import { Logo } from "@/components/logo";

// --- 组件部分 ---

// 1. 动态背景组件
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-zinc-950">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          x: [-100, 100, -100],
          y: [-50, 50, -50],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/30 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [0, -60, 0],
          x: [50, -50, 50],
          y: [100, -50, 100],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-600/20 rounded-full blur-[140px]"
      />
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40vw] h-[40vw] bg-cyan-500/20 rounded-full blur-[100px]"
      />
    </div>
  );
};

// 2. 提交按钮组件 (带 Loading 状态)
function SubmitButton({ text, icon: Icon }: { text: string; icon?: any }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      type="submit"
      className="group relative w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)]"
    >
      {pending ? (
        <Loader2 className="animate-spin size-5" />
      ) : (
        <>
          {text}
          {Icon && <Icon className="size-4 group-hover:translate-x-1 transition-transform" />}
        </>
      )}
    </button>
  );
}

// 3. MUI 风格输入框封装
const FloatingInput = ({
  name,
  type = "text",
  label,
  icon: Icon,
  value,
  onChange,
  rightElement,
}: {
  name: string;
  type?: string;
  label: string;
  icon: any;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rightElement?: React.ReactNode;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;

  return (
    <div className="relative mb-5 group">
      <div
        className={`absolute inset-0 border border-zinc-700 rounded-xl transition-all duration-300 pointer-events-none ${
          isFocused ? "border-blue-500 ring-1 ring-blue-500/50 bg-blue-500/5" : "bg-zinc-900/50"
        }`}
      />
      
      {/* Icon */}
      <div className="absolute left-3 top-3.5 text-zinc-500 transition-colors group-hover:text-zinc-400">
        <Icon className="size-5" />
      </div>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full bg-transparent border-none outline-none text-zinc-100 px-10 py-3 pt-4 pb-2 text-sm placeholder-transparent z-10 relative"
        placeholder={label} // Required for :placeholder-shown trick if using CSS only, but we use JS state here
      />

      {/* Label Animation */}
      <label
        className={`absolute left-10 transition-all duration-200 pointer-events-none text-zinc-500 ${
          isFocused || hasValue
            ? "top-1 text-[10px] text-blue-400"
            : "top-3.5 text-sm"
        }`}
      >
        {label}
      </label>

      {/* Right Element (Verify Button etc) */}
      {rightElement && (
        <div className="absolute right-2 top-2 z-20">
          {rightElement}
        </div>
      )}
    </div>
  );
};

// --- 主页面 ---

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  
  // 注册表单状态
  const [regData, setRegData] = useState({ name: "", email: "", password: "", code: "" });
  
  // 验证码倒计时状态
  const [countdown, setCountdown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (countdown > 0) return;
    setIsSendingCode(true);
    
    try {
      const res = await sendVerificationCode(regData.email);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("验证码已发送，请查看控制台");
        setCountdown(180);
      }
    } catch {
      toast.error("发送验证码失败");
    } finally {
      setIsSendingCode(false);
    }
  };

  // 切换处理函数
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setRegData({ name: "", email: "", password: "", code: "" }); // 切换时清空
  };

  //import logo from ""

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden font-sans bg-zinc-950 text-white">
      <AnimatedBackground />

      <div className="z-10 w-full max-w-md px-6">
        
        {/* 头部 Logo */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          <Logo size={80} className="text-white" />
          <h2 className="text-2xl font-bold tracking-tight text-white">
            z0 Agent
          </h2>
        </div>

        {/* 卡片容器 */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait" initial={false}>
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, rotateY: -90, x: -50 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: 90, x: 50 }}
                transition={{ duration: 0.4, ease: "backOut" }}
                className="w-full"
              >
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                  <h3 className="text-xl font-semibold mb-6">欢迎回来</h3>
                  
                  <form action={async (formData) => {
                      const res = await loginAction(null, formData);
                      if(res?.error) {
                        toast.error(res.error);
                        return;
                      }
                      if(res?.success) {
                        // 使用 NextAuth 登录
                        const result = await signIn("credentials", {
                          email: formData.get("email"),
                          password: formData.get("password"),
                          redirect: false,
                        });
                        
                        if (result?.error) {
                          toast.error("登录失败");
                        } else {
                          toast.success("登录成功");
                          router.push("/");
                          router.refresh();
                        }
                      }
                  }}>
                    <FloatingInput 
                      name="email" 
                      label="电子邮箱" 
                      icon={Mail} 
                    />
                    <FloatingInput 
                      name="password" 
                      type="password" 
                      label="密码" 
                      icon={Lock} 
                    />
                    
                    <div className="flex justify-end mb-6">
                      <button type="button" className="text-xs text-zinc-400 hover:text-white transition-colors">
                        忘记密码?
                      </button>
                    </div>

                    <SubmitButton text="登录" icon={ArrowRight} />
                  </form>

                  <div className="mt-6 text-center text-sm text-zinc-400">
                    还没有账号?{" "}
                    <button onClick={toggleMode} className="text-blue-400 hover:text-blue-300 font-medium ml-1 transition-colors">
                      立即注册
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, rotateY: 90, x: 50 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: -90, x: -50 }}
                transition={{ duration: 0.4, ease: "backOut" }}
                className="w-full"
              >
                 <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                  <h3 className="text-xl font-semibold mb-6">创建新账号</h3>
                  
                  <form action={async (formData) => {
                       const res = await registerAction(null, formData);
                       if(res?.error) {
                         toast.error(res.error);
                         return;
                       }
                       if(res?.success) {
                         toast.success("注册成功！请登录");
                         setTimeout(() => {
                           setIsLogin(true);
                           setRegData({ name: "", email: "", password: "", code: "" });
                         }, 3000);
                       }
                  }}>
                    <FloatingInput 
                      name="name" 
                      label="用户名" 
                      icon={User} 
                      value={regData.name}
                      onChange={(e) => setRegData({...regData, name: e.target.value})}
                    />
                    <FloatingInput 
                      name="email" 
                      label="电子邮箱" 
                      icon={Mail} 
                      value={regData.email}
                      onChange={(e) => setRegData({...regData, email: e.target.value})}
                      rightElement={
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={isSendingCode || countdown > 0 || !regData.email}
                          className="h-8 px-3 rounded-lg bg-zinc-800 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-zinc-700"
                        >
                          {isSendingCode ? <Loader2 className="animate-spin size-3" /> : 
                           countdown > 0 ? `${countdown}s` : "获取验证码"}
                        </button>
                      }
                    />
                    <FloatingInput 
                      name="code" 
                      label="验证码" 
                      icon={CheckCircle2} 
                      value={regData.code}
                      onChange={(e) => setRegData({...regData, code: e.target.value})}
                    />
                    <FloatingInput 
                      name="password" 
                      type="password" 
                      label="设置密码" 
                      icon={Lock} 
                      value={regData.password}
                      onChange={(e) => setRegData({...regData, password: e.target.value})}
                    />

                    <div className="mt-2" />
                    <SubmitButton text="注册账号" icon={Sparkles} />
                  </form>

                  <div className="mt-6 text-center text-sm text-zinc-400">
                    已有账号?{" "}
                    <button onClick={toggleMode} className="text-blue-400 hover:text-blue-300 font-medium ml-1 transition-colors">
                      直接登录
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}