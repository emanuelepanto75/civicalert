'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/components/api';

export default function ToggleOperator({ id, active }) {
  const router = useRouter();
  async function toggle() {
    await api(`/api/ufficio/operators/${id}`, { method: 'PATCH', body: { active: !active } });
    router.refresh();
  }
  return (
    <button className={`btn-sm ${active ? 'danger' : ''}`} onClick={toggle}>
      {active ? 'Disattiva' : 'Riattiva'}
    </button>
  );
}
