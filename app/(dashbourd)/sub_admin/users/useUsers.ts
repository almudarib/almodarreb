'use client';

import { useEffect, useState, useCallback } from 'react';
import { listAllUsersSummary } from '@/app/actions/users';
import type { UserSummary } from '@/app/actions/users';

export function useSubAdminUsers() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await listAllUsersSummary();
    if (res.ok) setUsers(res.users.filter(u => u.kind === 'teacher'));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return { users, loading, reload: loadUsers, setUsers };
}
