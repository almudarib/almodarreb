'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginStudentByNationalId } from '@/app/actions/stu-auth';
import { Loader2, Fingerprint, IdCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

function toHex(bytes: ArrayBuffer) {
  const arr = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) {
    const h = arr[i].toString(16).padStart(2, '0');
    s += h;
  }
  return s;
}

async function computeFingerprint() {
  try {
    const parts = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      String(screen.width),
      String(screen.height),
      String(screen.colorDepth),
      String(new Date().getTimezoneOffset()),
    ].join('|');
    const enc = new TextEncoder();
    const data = enc.encode(parts);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toHex(digest).slice(0, 32);
  } catch {
    return [
      navigator.userAgent,
      navigator.platform,
      String(screen.width),
      String(screen.height),
    ].join(':');
  }
}

export default function StudentLoginPage() {
  const router = useRouter();
  const [nationalId, setNationalId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{ name: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const fp = await computeFingerprint();
      const res = await loginStudentByNationalId({
        national_id: nationalId.trim(),
        device_fingerprint: fp,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess({ name: res.student.name });
      router.push(`/student?student_id=${res.student.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10" dir="rtl">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="border-none shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden bg-white/80 backdrop-blur-sm">
            <div className="h-2 bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-gold)]" />
            <CardHeader className="space-y-1 text-center pt-8">
              <CardTitle className="text-3xl font-black text-[var(--brand-dark)] tracking-tight">
                تسجيل دخول الطالب
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                أدخل رقم الهوية للمتابعة
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <form onSubmit={onSubmit}>
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="national_id" className="text-[var(--brand-dark)] font-bold">رقم الهوية</Label>
                    <div className="relative">
                      <IdCard className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="national_id"
                        inputMode="numeric"
                        placeholder="مثال: 1234567890"
                        className="pr-10 border-neutral-200 focus:border-[var(--brand-teal)] focus:ring-[var(--brand-teal-13)] transition-all"
                        required
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-red-600 text-sm font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-[var(--brand-teal-13)] border border-[var(--brand-teal)] p-3 rounded-lg text-[var(--brand-dark)] text-sm font-medium flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-[var(--brand-teal)]" />
                      <span>تم تسجيل الدخول بنجاح</span>
                      <span className="font-bold">({success.name})</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-bold bg-[var(--brand-dark)] hover:bg-black transition-all shadow-lg hover:shadow-[var(--brand-teal-13)] disabled:opacity-70"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري التحقق...</span>
                      </div>
                    ) : (
                      'تسجيل الدخول'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
