"use client";

import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, PaintBucket, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile, updatePassword } from 'firebase/auth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  
  // State for General Settings
  const [displayName, setDisplayName] = useState('');
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  // State for Password Settings
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || 'مدير النظام');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSavingGeneral(true);
    setGeneralSuccess(false);
    try {
      await updateProfile(user, { displayName });
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile", error);
      alert("حدث خطأ أثناء تحديث البيانات.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword.length < 6) {
      setPasswordError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setIsSavingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);
    
    try {
      await updatePassword(user, newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error updating password", error);
      if (error.code === 'auth/requires-recent-login') {
        setPasswordError("يجب تسجيل الخروج والدخول مجدداً لتغيير كلمة المرور لدواعي أمنية.");
      } else {
        setPasswordError("حدث خطأ أثناء تغيير كلمة المرور.");
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-in-out">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-gray-500 mt-1 text-sm">تخصيص النظام وإدارة تفضيلات حسابك.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 space-y-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Shield className="w-5 h-5" /> الحساب والأمان
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Bell className="w-5 h-5" /> الإشعارات
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'appearance' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <PaintBucket className="w-5 h-5" /> المظهر
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
          {activeTab === 'general' && (
            <div className="space-y-10 animate-in fade-in">
              
              {/* Profile Details */}
              <section className="space-y-6">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">الملف الشخصي</h3>
                  <p className="text-sm text-gray-500">البيانات الأساسية التي تظهر في النظام.</p>
                </div>
                
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم / الشركة</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (لا يمكن تغييره)</label>
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      disabled 
                      className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 text-left" 
                      dir="ltr" 
                    />
                  </div>
                  <div className="pt-2 flex items-center gap-4">
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={isSavingGeneral}
                      className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 min-w-[140px]"
                    >
                      {isSavingGeneral ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التغييرات
                    </button>
                    {generalSuccess && (
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4" /> تم التحديث بنجاح
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* Password Section */}
              <section className="space-y-6">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">الأمان وكلمة المرور</h3>
                  <p className="text-sm text-gray-500">تحديث كلمة المرور لحماية حسابك.</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-left"
                      dir="ltr" 
                    />
                    {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
                  </div>
                  <div className="pt-2 flex items-center gap-4">
                    <button 
                      type="submit"
                      disabled={isSavingPassword || !newPassword}
                      className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 min-w-[140px]"
                    >
                      {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      تغيير كلمة المرور
                    </button>
                    {passwordSuccess && (
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4" /> تم التغيير بنجاح
                      </span>
                    )}
                  </div>
                </form>
              </section>

            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in">
              <h3 className="text-lg font-bold border-b pb-2">إشعارات النظام</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded" />
                  <span className="text-gray-700 text-sm">تلقي إشعارات عند إضافة عميل أو مهمة جديدة</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded" />
                  <span className="text-gray-700 text-sm">تنبيهات تقارير الأداء الأسبوعية</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in">
              <h3 className="text-lg font-bold border-b pb-2">تخصيص المظهر</h3>
              <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300 text-center">
                <PaintBucket className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">قريباً..</p>
                <p className="text-sm text-gray-500 mt-1">سيتم إضافة دعم الوضع الداكن (Dark Mode) وتخصيص ألوان النظام في التحديثات القادمة.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
