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

export type NotificationType =
  | "status_update"
  | "admin_message";

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

  const [notifications, setNotifications] =
    useState<NotificationRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [filter, setFilter] =
    useState<"All" | "Unread">("All");

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) {
          setLoading(true);
        }

        setErrorMessage("");

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        setNotifications(
          (data as NotificationRecord[]) ||
            []
        );
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error
        );

        const code =
          (
            error as {
              code?: string;
            } | null
          )?.code;

        const details =
          error instanceof Error
            ? error.message
            : String(
                error ?? ""
              );

        if (
          code === "PGRST205" ||
          /could not find the table/i.test(
            details
          )
        ) {
          setErrorMessage(
            "Notifications are not set up on the server yet."
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

    let channel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    async function subscribe() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user || !active) {
        return;
      }

      channel = supabase
        .channel(
          `notifications:${user.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const incoming =
              payload.new as NotificationRecord;

            setNotifications(
              (prev) =>
                prev.some(
                  (item) =>
                    item.id ===
                    incoming.id
                )
                  ? prev
                  : [
                      incoming,
                      ...prev,
                    ]
            );
          }
        )
        .subscribe();
    }

    subscribe();

    return () => {
      active = false;

      if (channel) {
        supabase.removeChannel(
          channel
        );
      }
    };
  }, []);

  const markAsRead = async (
    id: string
  ) => {
    setNotifications(
      (prev) =>
        prev.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  is_read:
                    true,
                }
              : item
        )
    );

    const { error } =
      await supabase
        .from(
          "notifications"
        )
        .update({
          is_read: true,
        })
        .eq("id", id);

    if (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );

      await loadNotifications(
        true
      );
    }
  };

  const markAllAsRead =
    async () => {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      setNotifications(
        (prev) =>
          prev.map(
            (item) => ({
              ...item,
              is_read: true,
            })
          )
      );

      const { error } =
        await supabase
          .from(
            "notifications"
          )
          .update({
            is_read: true,
          })
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "is_read",
            false
          );

      if (error) {
        console.error(
          "Failed to mark all as read:",
          error
        );

        await loadNotifications(
          true
        );
      }
    };

  const handleNotificationClick =
    async (
      item: NotificationRecord
    ) => {
      if (!item.is_read) {
        await markAsRead(
          item.id
        );
      }

      if (item.report_id) {
        navigate(
          `/report/${item.report_id}?view=timeline`
        );

        return;
      }

      if (item.link_url) {
        const separator =
          item.link_url.includes(
            "?"
          )
            ? "&"
            : "?";

        navigate(
          `${item.link_url}${separator}view=timeline`
        );
      }
    };

  const filteredNotifications =
    notifications.filter(
      (item) =>
        filter === "Unread"
          ? !item.is_read
          : true
    );

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.is_read
    ).length;

  const getNotificationIcon = (
    type: NotificationType
  ) => {
    if (
      type ===
      "status_update"
    ) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
          <FiCheckCircle
            size={20}
          />
        </div>
      );
    }

    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
        <FiInfo
          size={20}
        />
      </div>
    );
  };

  const formatDate = (
    dateString: string
  ) => {
    return new Date(
      dateString
    ).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="rounded-xl p-2 text-slate-700 transition-all hover:bg-slate-100"
          >
            <FiArrowLeft
              size={20}
            />
          </button>

          <div>
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
              Notifications
            </h1>

            <p className="text-xs font-semibold text-slate-500">
              Updates on reports &amp; barangay notices
            </p>
          </div>
        </div>

        {unreadCount >
          0 && (
          <button
            type="button"
            onClick={
              markAllAsRead
            }
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800 transition-all hover:text-emerald-900"
          >
            <FiCheck
              size={14}
            />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() =>
            setFilter(
              "All"
            )
          }
          className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
            filter === "All"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All (
          {
            notifications.length
          }
          )
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter(
              "Unread"
            )
          }
          className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
            filter ===
            "Unread"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Unread (
          {unreadCount})
        </button>
      </div>

      {errorMessage ? (
        <div className="py-12 text-center">
          <p className="text-sm font-extrabold text-amber-700">
            {
              errorMessage
            }
          </p>

          <button
            type="button"
            onClick={() =>
              loadNotifications(
                true
              )
            }
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800 transition-all hover:bg-emerald-100"
          >
            <FiRefreshCw
              size={14}
            />
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-sm font-semibold text-slate-400">
          Loading notifications...
        </div>
      ) : filteredNotifications.length ===
        0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FiBell
              size={21}
            />
          </div>

          <p className="mt-3 text-sm font-extrabold text-slate-700">
            {filter ===
            "Unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Updates on your waste reports and notices will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map(
            (item) => (
              <button
                key={
                  item.id
                }
                type="button"
                onClick={() =>
                  handleNotificationClick(
                    item
                  )
                }
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  !item.is_read
                    ? "border-emerald-200 bg-emerald-50/40 shadow-xs hover:bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/20"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {getNotificationIcon(
                    item.type
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black text-slate-900">
                        {
                          item.title
                        }
                      </p>

                      <span className="shrink-0 text-[10px] font-bold text-slate-400">
                        {formatDate(
                          item.created_at
                        )}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                      {
                        item.message
                      }
                    </p>

                    {item.report_id && (
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                        View report progress →
                      </p>
                    )}
                  </div>

                  {!item.is_read && (
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />
                  )}
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}