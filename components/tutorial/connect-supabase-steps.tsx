export function ConnectSupabaseSteps() {
  return (
    <div className="rounded-md border p-6">
      <h2 className="text-lg font-semibold mb-3">الخطوات لربط Supabase</h2>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>إنشاء مشروع على Supabase</li>
        <li>ضبط .env.local بالقيم المطلوبة</li>
        <li>تشغيل التطبيق والتأكد من حالة الاتصال</li>
      </ol>
      <div className="mt-4 grid gap-2">
        <div className="text-xs">
          NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        </div>
      </div>
    </div>
  );
}

