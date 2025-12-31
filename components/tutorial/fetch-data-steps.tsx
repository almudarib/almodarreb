export function FetchDataSteps() {
  return (
    <div className="rounded-md border p-6">
      <h2 className="text-lg font-semibold mb-3">الخطوات لجلب البيانات</h2>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>استخدم عميل السيرفر من lib/supabase/server</li>
        <li>تحقق من جلسة المستخدم</li>
        <li>نفّذ الاستعلامات المطلوبة ثم اعرض النتائج</li>
      </ol>
    </div>
  );
}

