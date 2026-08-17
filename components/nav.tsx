'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sections = [
  ['Overview', ['/dashboard']],
  ['Jobs', ['/jobs']],
  ['Applications', ['/applications']],
  ['Career Profile', ['/profile']],
  ['AI Agent', ['/agent']],
  ['Resume Studio', ['/profile']],
  ['Interview Center', ['/interviews']],
  ['Companies', ['/companies']],
  ['Analytics', ['/analytics']],
  ['Integrations', ['/integrations']],
  ['Security', ['/security']],
  ['Settings', ['/settings']],
] as const;

export function Nav({ user }: { user: { name: string } }) {
  const path = usePathname();
  return <aside className="sidebar">
    <div className="logo">CAREERLY <span>OS</span></div>
    <div className="nav-section"><div className="nav-title">Workspace</div><div className="nav">
      {sections.map(([label, paths]) => <Link key={label} className={paths.some(p => path === p || (p !== '/dashboard' && path.startsWith(p))) ? 'active' : ''} href={paths[0]}>{label}</Link>)}
    </div></div>
    <div style={{position:'absolute',left:16,right:16,bottom:16}} className="card">
      <div className="small muted">Signed in as</div><strong>{user.name}</strong>
      <form action="/api/auth/logout" method="post" style={{marginTop:10}}><button className="btn" style={{width:'100%'}}>Log out</button></form>
    </div>
  </aside>;
}
