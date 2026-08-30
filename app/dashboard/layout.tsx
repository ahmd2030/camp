import React from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

import AdminChat from "@/components/AdminChat";

export const maxDuration = 60;

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col md:pr-64 transition-all duration-300 min-w-0">
        {/* Top Navigation */}
        <Navbar />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-gray-50 min-w-0 w-full relative">
          {children}
        </main>
      </div>
    </div>
    <AdminChat />
    </>
  );
}
