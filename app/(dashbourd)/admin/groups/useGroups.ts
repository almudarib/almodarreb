import * as React from 'react';
import { listExamGroups, type ExamGroupRecord } from '@/app/actions/exam';

export function useGroups() {
  const [groups, setGroups] = React.useState<ExamGroupRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listExamGroups();
      if (!res.ok) {
        setError(res.error);
        setGroups([]);
        return;
      }
      setGroups(res.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load, reloadKey]);

  const reload = React.useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  return { groups, loading, error, reload };
}
