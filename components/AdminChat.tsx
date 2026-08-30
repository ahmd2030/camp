"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, Loader2, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([
    { role: 'assistant', content: 'مرحباً سيدي المدير، أنا المساعد الإداري الخاص بك. كيف يمكنني مساعدتك أو أي الأقسام تريد إضافة تعليمات لها اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const playNotificationSound = () => {
    try {
      // A simple short pop sound in base64
      const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD//wEA");
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play blocked by browser', e));
    } catch (e) {}
  };

  // Load chat history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('adminChatHistory');
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }

    // Proactive check on mount
    const checkProactiveAlerts = async () => {
      try {
        const lastCheck = localStorage.getItem('adminChatLastCheck');
        const now = Date.now();
        // Only check once every 10 minutes to avoid spamming
        if (lastCheck && now - parseInt(lastCheck) < 10 * 60 * 1000) return;
        
        localStorage.setItem('adminChatLastCheck', now.toString());
        
        const res = await fetch('/api/admin-proactive');
        const data = await res.json();
        
        if (data.message) {
          setMessages(prev => {
            // Check if this exact message is already the last one
            if (prev[prev.length - 1]?.content === data.message) return prev;
            
            const newMessages = [...prev, { role: 'assistant', content: data.message }];
            
            // If chat is closed, show badge and play sound
            setIsOpen(currentIsOpen => {
              if (!currentIsOpen) {
                setUnreadCount(c => c + 1);
                playNotificationSound();
              }
              return currentIsOpen;
            });
            
            return newMessages;
          });
        }
      } catch (e) {
        console.error('Proactive check failed', e);
      }
    };

    // Delay the check slightly so it doesn't block initial render
    const timer = setTimeout(checkProactiveAlerts, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Save chat history on update
  useEffect(() => {
    try {
      localStorage.setItem('adminChatHistory', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      setUnreadCount(0); // Clear unread when opened
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });
      
      const data = await response.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ أثناء معالجة الطلب.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'تعذر الاتصال بالخادم.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="chat-bot-button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-colors relative"
            title="محادثة الإدارة"
          >
            <Bot className="w-7 h-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-bot-window"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '500px'
            }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed left-6 bottom-6 w-80 md:w-[400px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-indigo-100 overflow-hidden ${isMinimized ? '' : 'max-h-[80vh]'}`}
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between cursor-pointer select-none" onClick={() => setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">إدارة النظام (AI)</h3>
                  <p className="text-[10px] text-indigo-200">متصل وجاهز للتعليمات</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (confirm('هل تريد حذف محادثة الإدارة وبدء دردشة جديدة؟')) {
                      const initialMsg = [{ role: 'assistant', content: 'مرحباً سيدي المدير، أنا المساعد الإداري الخاص بك. كيف يمكنني مساعدتك أو أي الأقسام تريد إضافة تعليمات لها اليوم؟' }];
                      setMessages(initialMsg);
                      localStorage.setItem('adminChatHistory', JSON.stringify(initialMsg));
                    }
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  title="مسح المحادثة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div 
                        className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-end">
                      <div className="bg-white text-slate-500 border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        الإدارة تفكر...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-100 flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اكتب تعليماتك للإدارة هنا..."
                    className="flex-1 max-h-32 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-5 h-5 -ml-1" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
