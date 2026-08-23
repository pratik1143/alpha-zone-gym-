"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { followupService, FollowUpItem } from '@/services/followup.service';

export function useFollowups() {
  const [dbFollowups, setDbFollowups] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = followupService.subscribe(
      (data) => {
        setDbFollowups(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter out any legacy auto trigger tasks and sort strictly date-wise (ascending)
  const followups = useMemo(() => {
    const cleanList = dbFollowups.filter((f) => {
      const notesLower = (f.notes || '').toLowerCase();
      const titleLower = (f.title || '').toLowerCase();
      const descLower = (f.description || '').toLowerCase();
      return (
        !notesLower.includes('auto trigger') &&
        !titleLower.includes('auto trigger') &&
        !descLower.includes('auto trigger')
      );
    });

    cleanList.sort((a, b) => {
      const tsA = a.scheduledTimestamp || (a.scheduledDate ? new Date(`${a.scheduledDate}T${a.scheduledTime || '09:00'}`).getTime() : 0);
      const tsB = b.scheduledTimestamp || (b.scheduledDate ? new Date(`${b.scheduledDate}T${b.scheduledTime || '09:00'}`).getTime() : 0);
      return tsA - tsB;
    });

    return cleanList;
  }, [dbFollowups]);

  const pendingCount = useMemo(() => {
    return followups.filter((f) => f.status === 'Pending').length;
  }, [followups]);

  const dueNowCount = useMemo(() => {
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    return followups.filter(
      (f) =>
        f.status === 'Pending' &&
        f.scheduledDate === todayStr &&
        f.scheduledTimestamp <= now
    ).length;
  }, [followups]);

  const nextHourCount = useMemo(() => {
    const now = Date.now();
    const oneHourLater = now + 60 * 60 * 1000;
    const todayStr = new Date().toISOString().split('T')[0];
    return followups.filter(
      (f) =>
        f.status === 'Pending' &&
        f.scheduledDate === todayStr &&
        f.scheduledTimestamp > now &&
        f.scheduledTimestamp <= oneHourLater
    ).length;
  }, [followups]);

  const overdueCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return followups.filter(
      (f) => f.status === 'Pending' && f.scheduledDate < todayStr
    ).length;
  }, [followups]);

  const completedTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return followups.filter(
      (f) => f.status === 'Completed' && f.completedAt?.startsWith(todayStr)
    ).length;
  }, [followups]);

  const todaysCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return followups.filter(
      (f) => f.status === 'Pending' && f.scheduledDate <= todayStr
    ).length;
  }, [followups]);

  const createFollowup = useCallback(async (data: Partial<FollowUpItem>) => {
    const item = await followupService.create(data);
    return item;
  }, []);

  const completeFollowup = useCallback(
    async (
      id: string,
      remarks: string,
      outcome: string,
      memberId?: string | null,
      enquiryId?: string | null
    ) => {
      await followupService.complete(id, remarks, outcome, memberId, enquiryId);
      setDbFollowups((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'Completed',
                remarks,
                outcome,
                completedAt: new Date().toISOString(),
              }
            : f
        )
      );
    },
    []
  );

  const snoozeFollowup = useCallback(async (task: FollowUpItem) => {
    const res = await followupService.snooze(task);
    setDbFollowups((prev) =>
      prev.map((f) =>
        f.id === task.id
          ? {
              ...f,
              scheduledTime: res.nextHourStr,
              scheduledTimestamp: Date.now() + 3600000,
            }
          : f
      )
    );
    return res;
  }, []);

  const cancelFollowup = useCallback(async (id: string) => {
    await followupService.cancel(id);
    setDbFollowups((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'Cancelled' } : f))
    );
  }, []);

  const removeFollowup = useCallback(async (id: string) => {
    await followupService.remove(id);
    setDbFollowups((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return {
    followups,
    loading,
    pendingCount,
    todaysCount,
    dueNowCount,
    nextHourCount,
    overdueCount,
    completedTodayCount,
    createFollowup,
    completeFollowup,
    snoozeFollowup,
    cancelFollowup,
    removeFollowup,
  };
}


