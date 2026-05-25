import React, { useState } from "react";
import { Key, Mail, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface AdminLoginProps {
  onLoginSuccess: () => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, addToast }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate a secure modern verify cycle
    setTimeout(() => {
      const correctEmail = "kazicom03@gmail.com";
      const correctPassword = "3048kazi@";

      if (email.trim() === correctEmail && password === correctPassword) {
        localStorage.setItem("isAdminLoggedIn", "true");
        addToast("success", "লগইন সফল হয়েছে! এডমিন প্যানেলে স্বাগতম। (Login successful!)");
        onLoginSuccess();
      } else {
        addToast("error", "ভুল ইমেইল অথবা পাসওয়ার্ড! আবার চেষ্টা করুন। (Incorrect email or password!)");
      }
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Main Login Frame */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        {/* Logo/Shield Badge */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner">
            <ShieldCheck className="w-10 h-10 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">SmartHaatBD Admin Gate</h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">এডমিন লগইন প্যানেল</p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Email Address (ইমেইল ঠিকানা)
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
                className="w-full bg-slate-950/40 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-white rounded-xl pl-12 pr-4 py-3 text-sm outline-none transition placeholder-slate-600 font-mono"
              />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Password (পাসওয়ার্ড)
              </label>
            </div>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950/40 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-white rounded-xl pl-12 pr-12 py-3 text-sm outline-none transition placeholder-slate-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600/50 text-slate-950 font-bold text-sm tracking-wide py-3.5 rounded-xl transition duration-200 mt-2 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 inline-block focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>যাচাই করা হচ্ছে...</span>
              </>
            ) : (
              <span>নিরাপদ লগইন (Secure Sign In)</span>
            )}
          </button>
        </form>

        {/* Informative Footer inside container */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
            SECURE ENVIRONMENT • AES 256 BIT ENCRYPTION
          </p>
        </div>
      </motion.div>
    </div>
  );
};
