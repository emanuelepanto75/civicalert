import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import AnonymousDefault from './AnonymousDefault';
import DeleteAccount from './DeleteAccount';
import LogoutButton from './LogoutButton';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/accedi?next=/profilo');
  return (
    <div className="page">
      <h1>Profilo</h1>
      <div className="card">
        <div className="card-body">
          <div className="kv"><span className="k">Nome</span><span className="v">{user.firstName} {user.lastName}</span></div>
          <div className="kv"><span className="k">Email</span><span className="v">{user.email}</span></div>
          <div className="kv"><span className="k">Telefono</span><span className="v">{user.phone || '—'}</span></div>
          {user.role !== 'CITIZEN' && (
            <div className="kv"><span className="k">Ruolo</span><span className="v">{user.role}</span></div>
          )}
        </div>
      </div>
      {user.role === 'CITIZEN' && <AnonymousDefault initial={user.anonymousDefault} />}
      <LogoutButton />
      {user.role === 'CITIZEN' && <DeleteAccount />}
      <p className="muted small center">
        <Link href="/chi-siamo">Chi siamo</Link> · <Link href="/privacy">Privacy e cookie</Link>
      </p>
    </div>
  );
}
