'use client';

export default function LogoutButton() {
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/accedi';
  }
  return <button onClick={logout}>Esci</button>;
}
