'use client';

import { useEffect, useState, useCallback } from 'react';
import { listAllUsersSummary } from '@/app/actions/users';
import type { UserSummary } from '@/app/actions/users';

export function useUsers() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await listAllUsersSummary();
    if (res.ok) setUsers(res.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return { users, loading, reload: loadUsers, setUsers };
}
