'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  MessageSquare, Settings, BarChart2, Users, Plug, UserCircle, LogOut,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/dashboard/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/dashboard/channels', label: 'Channels', icon: Plug },
  { href: '/dashboard/contacts', label: 'Contacts', icon: UserCircle },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base">Social Connector</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 text-slate-400">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-medium text-white">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{session?.user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{session?.user?.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
