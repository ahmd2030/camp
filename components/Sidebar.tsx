"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  Briefcase,
  FileText,
  Mail,
  Rocket,
  BarChart3,
  Target,
  MessageSquare,
  Activity,
  Link as LinkIcon
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navItems = [
    { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
    { name: 'كشاف العملاء 🔍', href: '/dashboard/scout', icon: Target },
    { name: 'رادار الصيد 🎯', href: '/dashboard/radar', icon: Target },
    { name: 'صندوق الوارد 📥', href: '/dashboard/inbox', icon: Mail },
    { name: 'خزنة الشراكات 💼', href: '/dashboard/vault', icon: Briefcase },
    { name: 'مركز الفوترة ⚙️', href: '/dashboard/billing', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-primary text-white rounded-md shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar Component */}
      <aside 
        className={`fixed top-0 right-0 h-full w-64 bg-white text-slate-800 z-40 
        transform transition-transform duration-300 ease-in-out flex flex-col shadow-lg border-l border-slate-200
        ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}
      >
        {/* Logo / Brand */}
        <div className="h-16 flex items-center justify-center border-b border-slate-100">
          <Briefcase className="w-8 h-8 text-orange-500 ml-2" />
          <span className="text-xl font-bold tracking-wider text-slate-800">نظام الإدارة</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 group
                  ${isActive 
                    ? 'bg-orange-50 text-orange-600' 
                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Icon className={`w-5 h-5 ml-3 ${isActive ? 'text-orange-500' : 'text-slate-400 group-hover:text-orange-500'}`} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Logout area at bottom */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={async () => {
              const { logout } = await import('@/services/auth');
              await logout();
            }}
            className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 ml-3 text-red-500" />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
