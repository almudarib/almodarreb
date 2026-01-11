"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LockKeyhole, Mail } from "lucide-react"; // أيقونات إضافية
import { Facebook, Instagram, WhatsApp, Audiotrack } from "@mui/icons-material";
import Image from "next/image";
import logo from "@/app/public/logo.jpeg";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "خطأ في البريد الإلكتروني أو كلمة المرور");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-md mx-auto", className)} {...props} dir="rtl">
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden bg-white/80 backdrop-blur-sm">
        {/* شريط علوي جمالي بلون الهوية */}
        <div className="h-2 bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-gold)]" />
        
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Image src={logo} alt="Logo" width={64} height={64} className="rounded-lg" />
          </div>
          <CardTitle className="text-3xl font-black text-[var(--brand-dark)] tracking-tight">
            مرحباً بك مجدداً
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            قم بتسجيل الدخول للمتابعة إلى لوحة التحكم
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 pt-4">
          <form onSubmit={handleLogin}>
            <div className="grid gap-5">
              {/* حقل البريد الإلكتروني */}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[var(--brand-dark)] font-bold">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pr-10 border-neutral-200 focus:border-[var(--brand-teal)] focus:ring-[var(--brand-teal-13)] transition-all"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* حقل كلمة المرور */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[var(--brand-dark)] font-bold">كلمة المرور</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-[var(--brand-teal)] hover:text-[var(--brand-teal-hover)] hover:underline underline-offset-4"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pr-10 border-neutral-200 focus:border-[var(--brand-teal)] focus:ring-[var(--brand-teal-13)] transition-all"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* عرض الأخطاء بشكل أفضل */}
              {error && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-red-600 text-sm font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  {error}
                </div>
              )}

              {/* زر تسجيل الدخول */}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold bg-[var(--brand-dark)] hover:bg-black transition-all shadow-lg hover:shadow-[var(--brand-teal-13)] disabled:opacity-70" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>
              <div className="flex items-center justify-center gap-4 mt-4 text-neutral-600">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-[var(--brand-teal)]">
                  <Facebook />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-[var(--brand-teal)]">
                  <Instagram />
                </a>
                <a href="https://wa.me" target="_blank" rel="noreferrer" aria-label="WhatsApp" className="hover:text-[var(--brand-teal)]">
                  <WhatsApp />
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok" className="hover:text-[var(--brand-teal)]">
                  <Audiotrack />
                </a>
              </div>
              <p className="text-center mt-2 text-sm text-neutral-700">تطبيق المدرب باشراف وادارة ابو تيم</p>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <p className="px-8 text-center text-sm text-neutral-500">
        بالضغط على تسجيل الدخول، أنت توافق على{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-[var(--brand-teal)]">شروط الخدمة</Link>
      </p>
    </div>
  );
}
