"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Loader2
} from 'lucide-react';
import { getTasks, addTask, deleteTask, updateTaskStatus, TaskData } from '@/services/tasks';
import { getUsers, UserData } from '@/services/users';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [clientName, setClientName] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedTasks, fetchedUsers] = await Promise.all([getTasks(), getUsers()]);
    setTasks(fetchedTasks);
    setUsers(fetchedUsers);
    if (fetchedUsers.length > 0) setAssignedTo(fetchedUsers[0].name);
    setLoading(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: TaskData = { 
      title, description, assignedTo, clientName, dueDate, status: 'معلقة' 
    };

    const result = await addTask(newTask);
    if (result.success) {
      setIsModalOpen(false);
      setTitle(''); setDescription(''); setClientName(''); setDueDate('');
      fetchData();
    } else {
      alert('حدث خطأ أثناء الإضافة.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
      await deleteTask(id);
      fetchData();
    }
  };

  const toggleStatus = async (task: TaskData) => {
    const newStatus = task.status === 'مكتملة' ? 'معلقة' : 'مكتملة';
    await updateTaskStatus(task.id!, newStatus);
    fetchData();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المهام</h1>
          <p className="text-gray-500 mt-1 text-sm">توزيع وتتبع إنجاز المهام لفريق العمل.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-sm text-sm">
          <Plus className="w-4 h-4" />
          <span>مهمة جديدة</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">لا توجد مهام حالياً</h3>
          <p className="text-gray-500 mt-1">العمل منجز بالكامل! أضف مهام جديدة للبدء.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {tasks.map((task) => (
            <div key={task.id} className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center ${task.status === 'مكتملة' ? 'opacity-60' : ''}`}>
              <button onClick={() => toggleStatus(task)} className="flex-shrink-0 mt-1 sm:mt-0 text-gray-400 hover:text-primary transition-colors">
                {task.status === 'مكتملة' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </button>
              
              <div className="flex-1">
                <h3 className={`font-semibold text-gray-900 ${task.status === 'مكتملة' ? 'line-through text-gray-500' : ''}`}>
                  {task.title}
                </h3>
                {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {task.assignedTo.charAt(0)}
                    </span>
                    <span>{task.assignedTo}</span>
                  </div>
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span dir="ltr">{task.dueDate}</span>
                    </div>
                  )}
                  {task.clientName && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                      عميل: {task.clientName}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  task.status === 'مكتملة' ? 'bg-green-50 text-green-700' :
                  task.status === 'قيد التنفيذ' ? 'bg-blue-50 text-blue-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>
                  {task.status}
                </span>
                <button onClick={() => handleDelete(task.id!)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">مهمة جديدة</h2>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المهمة</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تعيين إلى (الموظف)</label>
                  <select required value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary">
                    {users.map(user => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                    {users.length === 0 && <option value="Admin">Admin</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستحقاق (اختياري)</label>
                  <input value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مرتبطة بعميل (اختياري)</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} type="text" placeholder="اسم العميل" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary" />
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">إلغاء</button>
                  <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">تعيين المهمة</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
