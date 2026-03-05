"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, CheckCheck, TrendingDown, TrendingUp, Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

type NotificationType = "payment" | "service" | "appointment" | "appointment_update" | "info";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  payment:            { icon: TrendingUp,   color: "text-green-600",  bg: "bg-green-100" },
  service:            { icon: TrendingDown, color: "text-red-500",    bg: "bg-red-100" },
  appointment:        { icon: Calendar,     color: "text-blue-600",   bg: "bg-blue-100" },
  appointment_update: { icon: Calendar,     color: "text-indigo-600", bg: "bg-indigo-100" },
  info:               { icon: Info,         color: "text-gray-500",   bg: "bg-gray-100" },
};

type Theme = "dark" | "light";

interface Props {
  theme?: Theme;
  /** polling interval in ms (default: 30000) */
  pollInterval?: number;
}

export default function NotificationBell({ theme = "dark", pollInterval = 30_000 }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[NotificationBell] API error:", res.status, err);
        return;
      }
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch (e) {
      console.error("[NotificationBell] fetch error:", e);
    }
  }, []);

  /* initial load + polling */
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(id);
  }, [fetchNotifications, pollInterval]);

  /* close on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markOne = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnread((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  };

  const markAll = async () => {
    setLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setLoading(false);
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) await markOne(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  /* ── button styles by theme ── */
  const btnClass = theme === "dark"
    ? "relative rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
    : "relative rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900";

  const dropClass = theme === "dark"
    ? "border border-gray-700 bg-gray-900"
    : "border border-gray-200 bg-white";

  const headerClass = theme === "dark"
    ? "border-gray-800 bg-gray-900/80"
    : "border-gray-100 bg-gray-50";

  const itemClass = (isRead: boolean) => theme === "dark"
    ? cn("flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors", isRead ? "hover:bg-gray-800/60" : "bg-blue-950/30 hover:bg-blue-950/50")
    : cn("flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors", isRead ? "hover:bg-gray-50" : "bg-blue-50/60 hover:bg-blue-50");

  const titleClass = theme === "dark" ? "text-white" : "text-gray-900";
  const msgClass   = theme === "dark" ? "text-gray-400" : "text-gray-500";
  const timeClass  = theme === "dark" ? "text-gray-500" : "text-gray-400";
  const markAllClass = theme === "dark"
    ? "text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
    : "text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors";
  const emptyClass = theme === "dark" ? "text-gray-500" : "text-gray-400";

  return (
    <div className="relative" ref={dropRef}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={btnClass} title="الإشعارات">
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={cn("absolute left-0 top-full mt-2 w-80 rounded-xl shadow-xl z-50 overflow-hidden", dropClass)}>
          {/* Header */}
          <div className={cn("flex items-center justify-between border-b px-4 py-3", headerClass)}>
            <div className="flex items-center gap-2">
              <Bell className={cn("h-4 w-4", theme === "dark" ? "text-gray-400" : "text-gray-500")} />
              <span className={cn("text-sm font-semibold", titleClass)}>الإشعارات</span>
              {unread > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button type="button" onClick={markAll} disabled={loading} className={markAllClass}>
                <CheckCheck className="inline h-3.5 w-3.5 ml-1" />
                قراءة الكل
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className={cn("py-12 text-center text-sm", emptyClass)}>
                <Bell className="mx-auto mb-3 h-10 w-10 opacity-20" />
                لا توجد إشعارات
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <div key={n.id} onClick={() => handleClick(n)} className={itemClass(n.isRead)}>
                    {/* Icon */}
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", cfg.bg)}>
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-medium leading-tight", titleClass, !n.isRead && "font-semibold")}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className={cn("mt-0.5 text-xs leading-relaxed", msgClass)}>{n.message}</p>
                      <p className={cn("mt-1 text-[11px]", timeClass)}>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}
                      </p>
                    </div>
                    {/* Mark read btn */}
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); markOne(n.id); }}
                        className={cn("mt-1 shrink-0 rounded p-0.5 transition-colors", theme === "dark" ? "text-gray-500 hover:text-blue-400" : "text-gray-400 hover:text-blue-600")}
                        title="تحديد كمقروء"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={cn("border-t px-4 py-2.5", headerClass)}>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className={cn("text-xs font-medium transition-colors", theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700")}
              >
                عرض جميع الإشعارات ←
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
