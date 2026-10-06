import ResetForm from './ResetForm';

export default async function ResetPasswordPage({ searchParams }) {
  const { token } = await searchParams;
  return <ResetForm token={token || ''} />;
}
