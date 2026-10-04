import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBell,
  FiCheckCircle,
  FiInfo,
  FiCheck,
  FiRefreshCw,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";

export type NotificationType = "status_update" | "admin_message";

export interface NotificationRecord {
  id: string;
  user_id: string;
  report_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<"All" | "Unread">("All");

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) {
          setLoading(true);
        }
        setErrorMessage("");

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setNotifications((data as NotificationRecord[]) || []);
      } catch (error) {
        console.error("Failed to load notifications:", error);

        const code = (error as { code?: string } | null)?.code;
        const details = error instanceof Error ? error.message : String(error ?? "");

        if (code === "PGRST205" || /could not find the table/i.test(details)) {
          setErrorMessage(
            "Notifications are not set up on the server yet. Run supabase/migrations/20261003000000_create_notifications.sql in the Supabase SQL Editor, then reload."
          );
        } else {
          setErrorMessage(
            "We couldn't load your notifications right now. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const incoming = payload.new as NotificationRecord;

            setNotifications((prev) =>
              prev.some((item) => item.id === incoming.id)
                ? prev
                : [incoming, ...prev]
            );
          }
        )
        .subscribe();
    }

    subscribe();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("Failed to mark notification as read:", error);
      await loadNotifications(true);
    }
  };

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true }))
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to mark all as read:", error);
      await loadNotifications(true);
    }
  };

  const filteredNotifications = notifications.filter((item) =>
    filter === "Unread" ? !item.is_read : true
  );

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const getNotificationIcon = (type: NotificationType) => {
    if (type === "status_update") {
      return (
        <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
          <FiCheckCircle size={20} />
        </div>
      );
    }

    return (
      <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
        <FiInfo size={20} />
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-all"
          >
            <FiArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Notifications
            </h1>

            <p className="text-xs font-semibold text-slate-500">
              Updates on reports &amp; barangay notices
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all"
          >
            <FiCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilter("All")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            filter === "All"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("Unread")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            filter === "Unread"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {errorMessage ? (
        <div className="py-12 text-center">
          <p className="text-sm font-extrabold text-amber-700">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => loadNotifications(true)}
            className="mt-3 inline-flex items-center gap-2 text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-all"
          >
            <FiRefreshCw size={14} />
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-sm font-semibold text-slate-400">
          Loading notifications...
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <FiBell size={21} />
          </div>

          <p className="mt-3 text-sm font-extrabold text-slate-700">
            {filter === "Unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Updates on your waste reports and notices will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (!item.is_read) markAsRead(item.id);
                if (item.link_url) navigate(item.link_url);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                !item.is_read
                  ? "bg-emerald-50/40 border-emerald-200 shadow-xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3.5">
                {getNotificationIcon(item.type)}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-900 truncate">
                      {item.title}
                    </p>

                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                    {item.message}
                  </p>
                </div>

                {!item.is_read && (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
