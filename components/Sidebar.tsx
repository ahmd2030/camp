"use client";

import React, { useState, useEffect } from 'react';
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
  Link as LinkIcon,
  GraduationCap
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const q = query(
      collection(db, 'contact_messages'),
      where('status', 'in', ['NEW', 'DRAFT'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Calculate unique emails that have pending messages
      const uniqueEmails = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.email) uniqueEmails.add(data.email);
      });
      setPendingCount(uniqueEmails.size);
    }, (error) => {
      console.warn("Error fetching pending messages count", error);
    });

    return () => unsubscribe();
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navItems = [
    { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
    { name: 'كشاف العملاء 🔍', href: '/dashboard/scout', icon: Target },
    { name: 'رادار الصيد 🎯', href: '/dashboard/radar', icon: Target },
    { name: 'صندوق الوارد 📥', href: '/dashboard/inbox', icon: Mail, badge: pendingCount },
    { name: 'المتابعات الذكية ⏰', href: '/dashboard/followups', icon: Activity },
    { name: 'خزنة الشراكات 💼', href: '/dashboard/vault', icon: Briefcase },
    { name: 'تدريب النظام 🧠', href: '/dashboard/training', icon: GraduationCap },
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
        <div className="h-20 flex items-center justify-center border-b border-slate-100 px-4">
          <img src="/logo.jpg" alt="Mango AI" className="w-10 h-10 object-contain rounded-lg ml-3 shadow-sm border border-slate-100" />
          <span className="text-xl font-black tracking-wider text-slate-800">نظام الإدارة</span>
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
                className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 group relative
                  ${isActive 
                    ? 'bg-orange-50 text-orange-600' 
                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Icon className={`w-5 h-5 ml-3 ${isActive ? 'text-orange-500' : 'text-slate-400 group-hover:text-orange-500'}`} />
                <span className="font-medium flex-1">{item.name}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="mr-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center justify-center min-w-[20px] shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}
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
