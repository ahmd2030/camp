"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Shield,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { getUsers, addUser, deleteUser, UserData } from '@/services/users';

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('موظف مبيعات');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const avatarStr = newUserName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    
    const newUser: UserData = {
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'نشط',
      avatar: avatarStr
    };

    const result = await addUser(newUser);
    if (result.success) {
      setIsModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      fetchUsers();
    } else {
      alert('حدث خطأ أثناء الإضافة. (تأكد من إعدادات Firestore Rules إذا كنت تستخدم قاعدة بيانات جديدة)');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      const result = await deleteUser(id);
      if (result.success) {
        fetchUsers();
      } else {
        alert("فشل الحذف. قد تحتاج لصلاحيات في Firebase.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-in-out">
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
          <p className="text-gray-500 mt-1 text-sm">عرض، إضافة، وتعديل صلاحيات أعضاء فريق العمل.</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="ابحث بالاسم أو البريد..."
            />
          </div>
          
          {/* Add Button */}
          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-sm transition-colors font-medium text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
            <span>إضافة مستخدم</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                <th className="py-4 px-6 font-medium whitespace-nowrap">المستخدم</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">البريد الإلكتروني</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">الصلاحية</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">الحالة</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    لا يوجد مستخدمين مسجلين بعد.
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-primary font-bold text-sm shadow-inner">
                        {user.avatar}
                      </div>
                      <span className="font-semibold text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600 text-sm">
                    {user.email}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      {user.role.includes('مدير') ? (
                        <Shield className="w-4 h-4 text-purple-500" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-blue-500" />
                      )}
                      <span>{user.role}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      user.status === 'نشط' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {user.status === 'نشط' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id!)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">إضافة مستخدم جديد</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                  <input required value={newUserName} onChange={e => setNewUserName(e.target.value)} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الدور (الصلاحية)</label>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary">
                    <option>مدير النظام</option>
                    <option>موظف مبيعات</option>
                    <option>دعم فني</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">إلغاء</button>
                  <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">إضافة مستخدم</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
