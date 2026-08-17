import './globals.css';
import { getCurrentUser } from '@/lib/auth';
import { Nav } from '@/components/nav';

export const metadata = { title: 'Careerly OS', description: 'Autonomous career operating system' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <html lang="en"><body>{children}</body></html>;
  return <html lang="en"><body><div className="app"><Nav user={user} /><main className="main">{children}</main></div></body></html>;
}
