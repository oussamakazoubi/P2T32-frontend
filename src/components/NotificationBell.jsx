import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
const API_URL = import.meta.env.VITE_API_URL;


const NotificationBell = () => {
  const { user } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();
  

  // Fetch notifications when user logs in or changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, {
        withCredentials: true,
      });
      setNotifications(res.data.notifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Mark a notification as read and update state
  const markAsRead = async (id) => {
    try {
      await axios.put(
        `${API_URL}/api/notifications/${id}/read`,
        {},
        { withCredentials: true }
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Count unread notifications for badge display
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="notification-bell"
      ref={dropdownRef}
      style={{ position: "relative" }}
    >
      <button
        className="btn btn-link position-relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        type="button"
      >
        <i className="bi bi-bell" style={{ fontSize: "1.5rem" }}></i>
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: "0.75rem" }}
          >
            {unreadCount}
            <span className="visually-hidden">notifications non lues</span>
          </span>
        )}
      </button>

      {open && (
        <div
          className="dropdown-menu show shadow"
          style={{
            position: "absolute",
            right: 0,
            width: "300px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 1050,
          }}
        >
          <h6 className="dropdown-header">Notifications</h6>
          {notifications.length === 0 && (
            <div className="dropdown-item text-muted">Aucune notification.</div>
          )}
          {notifications.map((notif) => (
            <button
              key={notif.id}
              className={`dropdown-item d-flex justify-content-between align-items-start ${
                notif.read ? "" : "fw-bold"
              }`}
              onClick={() => {
                if (!notif.read) markAsRead(notif.id);
              }}
              type="button"
            >
              <div style={{ whiteSpace: "normal" }}>{notif.message}</div>
              <small
                className="text-muted ms-2"
                style={{ fontSize: "0.75rem" }}
              >
                {new Date(notif.createdAt).toLocaleString()}
              </small>
            </button>
          ))}
          {notifications.length > 5 && (
            <button
              className="dropdown-item text-center"
              onClick={fetchNotifications}
              style={{ fontWeight: "bold" }}
              type="button"
            >
              Rafraîchir
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
