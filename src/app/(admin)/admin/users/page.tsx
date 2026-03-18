"use client";

import {
  Users as UsersIcon,
  Trash2,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/services/apiClient";
import type { AppUser } from "@/types/app";
import styles from "./Users.module.css";

export const Users = () => {
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await apiClient.get("/api/users");
        const payload = response.data as
          | { users?: unknown[]; data?: { users?: unknown[] } }
          | unknown[];

        const rawUsers = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.users)
          ? payload.users
          : Array.isArray(payload.data?.users)
          ? payload.data.users
          : [];

        setUsers(
          rawUsers
            .map((item) => {
              if (!item || typeof item !== "object") {
                return null;
              }

              const raw = item as {
                id?: string;
                _id?: string;
                name?: string;
                firstName?: string;
                email?: string;
                role?: "admin" | "customer";
                createdAt?: string;
                date?: string;
              };

              const id = raw.id ?? raw._id;
              const name = raw.name ?? raw.firstName;

              if (!id || !name || !raw.email) {
                return null;
              }

              return {
                id,
                name,
                email: raw.email,
                role: raw.role ?? "customer",
                date: raw.date ?? raw.createdAt ?? new Date().toISOString(),
              } satisfies AppUser;
            })
            .filter((value): value is AppUser => value !== null)
        );
      } catch {
        setUsers([]);
      }
    };

    void loadUsers();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <UsersIcon size={24} color="var(--primary)" />
        <h2 className={styles.title}>Користувачі</h2>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Ім'я</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Роль</th>
              <th className={styles.th}>Дата реєстрації</th>
              <th className={styles.th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {users.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, x: -20 }}
                >
                  <td className={styles.td}>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>
                        <UserIcon size={16} color="var(--primary)" />
                      </div>
                      {user.name}
                    </div>
                  </td>
                  <td className={styles.td}>{user.email}</td>
                  <td className={styles.td}>
                    <span
                      className={`${styles.roleBadge} ${
                        user.role === "admin"
                          ? styles.roleAdmin
                          : styles.roleCustomer
                      }`}
                    >
                      {user.role === "admin" && <Shield size={12} />}
                      {user.role === "admin" ? "Адмін" : "Клієнт"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {new Date(user.date).toLocaleDateString("uk-UA")}
                  </td>
                  <td className={styles.td}>
                    <button
                      onClick={() =>
                        setUsers((prev) =>
                          prev.filter((item) => item.id !== user.id)
                        )
                      }
                      disabled={user.role === "admin"}
                      className={`${styles.actionBtn} ${
                        user.role === "admin" ? styles.actionBtnDisabled : ""
                      }`}
                      title={
                        user.role === "admin"
                          ? "Неможливо видалити адміністратора"
                          : "Видалити"
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
