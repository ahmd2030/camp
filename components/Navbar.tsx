import React from 'react';
import { Bell, Search, User } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 sticky top-0 shadow-sm">
      {/* Mobile spacer to prevent overlapping with hamburger menu */}
      <div className="md:hidden w-10"></div>

      {/* Search Bar */}
      <div className="flex-1 flex items-center max-w-md">
        <div className="relative w-full text-gray-400 focus-within:text-primary">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-all"
            placeholder="بحث عن..."
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4 space-x-reverse ml-2 sm:ml-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors rounded-full hover:bg-gray-100">
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          <Bell className="h-6 w-6" />
        </button>

        {/* Profile Dropdown (Simplified) */}
        <div className="relative flex-shrink-0">
          <button className="flex items-center focus:outline-none p-1 rounded-full border-2 border-transparent hover:border-gray-200 transition-all">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
              <User className="h-5 w-5" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
