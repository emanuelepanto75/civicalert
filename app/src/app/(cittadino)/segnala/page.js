import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ReportWizard from './ReportWizard';

export const metadata = { title: 'Nuova segnalazione – CivicAlert' };

export default async function NewReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/accedi?next=/segnala');
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, icon: true },
  });
  return <ReportWizard categories={categories} />;
}
