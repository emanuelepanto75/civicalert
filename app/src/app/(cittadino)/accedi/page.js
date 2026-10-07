import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata = { title: 'Accedi – CivicAlerts' };

export default async function LoginPage({ searchParams }) {
  const { verifica, next, registrato } = await searchParams;
  // solo percorsi interni: "//sito.com" porterebbe fuori dall'app
  const safeNext = typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : '/';
  if (await getCurrentUser()) redirect(safeNext);
  return <LoginForm verifica={verifica} next={safeNext} registrato={registrato} />;
}
