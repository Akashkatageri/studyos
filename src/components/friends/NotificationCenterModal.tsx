import React from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserState, SocialNotification } from '../../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  notifications: SocialNotification[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationCenterModal({
  isOpen,
  onClose,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllAsRead,
}: NotificationCenterModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="notifications-overlay">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            id="notifications-backdrop"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#111422] border border-gray-800 rounded-3xl p-6 shadow-[0_24px_50px_rgba(0,0,0,0.85)] max-h-[80vh] flex flex-col"
            id="notifications-card"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-200 hover:text-white hover:bg-gray-700 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg z-20"
              style={{ minHeight: '44px', minWidth: '44px' }}
              id="close-notifications-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-between items-center pb-4 border-b border-gray-850 pr-12">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-black text-white uppercase tracking-wider leading-none">
                  Notifications
                </h3>
              </div>
              <button
                onClick={onMarkAllAsRead}
                className="text-[10px] font-mono text-blue-400 font-bold hover:underline uppercase tracking-wider cursor-pointer bg-transparent border-0"
              >
                Clear All
              </button>
            </div>

            {/* Notification timeline content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 divide-y divide-gray-850/40 custom-scrollbar">
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-10 italic">No social notifications yet.</p>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`flex items-start gap-3 pt-3.5 first:pt-0 ${notif.read ? 'opacity-65' : ''}`}
                  >
                    <span className="text-xl shrink-0 bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">{notif.senderAvatar}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-white leading-tight">{notif.title}</h4>
                        {!notif.read && (
                          <button
                            onClick={() => onMarkNotificationAsRead(notif.id)}
                            className="w-2 h-2 rounded-full bg-blue-400 shrink-0 cursor-pointer hover:scale-125 transition-transform border-0"
                            title="Mark read"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{notif.message}</p>
                      <span className="text-[9px] text-gray-600 font-mono block">
                        {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer mt-4 border-0"
            >
              Close Panel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
