'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Wrench,
  MessageSquare,
  Phone,
  Send,
  DollarSign,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agents', href: '/agents', icon: Users },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { name: 'Tools', href: '/tools', icon: Wrench },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'Phone Numbers', href: '/phone-numbers', icon: Phone },
  { name: 'Outbound', href: '/outbound', icon: Send },
  { name: 'Finance', href: '/finance', icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    window.dispatchEvent(new CustomEvent('sidebarToggle'));
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-card transition-all duration-300 ease-in-out overflow-hidden',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-border transition-all duration-300',
          isCollapsed ? 'justify-center px-0' : 'justify-between px-5'
        )}
      >
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">SupportFlow</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/dashboard">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        <div className="mb-2 px-2">
          {!isCollapsed && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Main
            </p>
          )}
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
                isCollapsed
                  ? 'justify-center px-0 py-2.5'
                  : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary' : '')} />
              {!isCollapsed && (
                <span className="whitespace-nowrap overflow-hidden transition-opacity duration-300">
                  {item.name}
                </span>
              )}
              {!isCollapsed && isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className={cn('border-t border-border p-3', isCollapsed ? 'text-center' : '')}>
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'sm'}
          onClick={toggleCollapse}
          className={cn(
            'w-full text-muted-foreground hover:text-foreground',
            isCollapsed ? 'h-9 w-9' : 'justify-start gap-2'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
