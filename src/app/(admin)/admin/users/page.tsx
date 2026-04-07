"use client";

import {
  Users as UsersIcon,
  Trash2,
  Shield,
  User as UserIcon,
  Edit2,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/UI/Button/Button";
import { FormInput } from "@/components/UI/FormInput/FormInput";
import { Modal } from "@/components/UI/Modal/Modal";
import { apiClient } from "@/services/apiClient";
import type { AppUser } from "@/types/app";
import styles from "./Users.module.css";

type AdminUser = AppUser & {
  phone?: string;
};

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  role: AdminUser["role"];
};

export const Users = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<UserFormState>({
    name: "",
    email: "",
    phone: "",
    role: "user",
  });

  const updateFormState = <K extends keyof UserFormState>(
    key: K,
    value: UserFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteUser = async (id: string) => {
    const shouldDelete = window.confirm(
      "Видалити цього користувача? Дію неможливо скасувати."
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await apiClient.delete(`/api/users/${id}`);
      setUsers((prev) => prev.filter((item) => item.id !== id));
      toast.success("Користувача видалено");
    } catch {
      toast.error("Не вдалося видалити користувача");
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await apiClient.get("/api/users", {
          params: { _ts: Date.now() },
        });
        const payload = response.data as
          | { users?: unknown[]; data?: { users?: unknown[] } | unknown[] }
          | unknown[];

        const rawUsers = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.users)
          ? payload.users
          : Array.isArray(payload.data)
          ? payload.data
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
                phone?: string;
                role?: "admin" | "user" | "customer" | "moderator";
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
                phone: raw.phone,
                role: raw.role ?? "user",
                date: raw.date ?? raw.createdAt ?? new Date().toISOString(),
              } satisfies AppUser;
            })
            .filter((value): value is AdminUser => value !== null)
        );
      } catch {
        setUsers([]);
        toast.error("Не вдалося завантажити користувачів");
      }
    };

    void loadUsers();
  }, []);

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormState({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiClient.put(`/api/users/${editingUser.id}`, {
        name: formState.name.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim(),
        role: formState.role,
      });

      const payload = response.data as {
        data?: {
          id?: string;
          _id?: string;
          name?: string;
          email?: string;
          phone?: string;
          role?: AdminUser["role"];
          createdAt?: string;
        };
      };

      const updated = payload.data;

      if (updated) {
        setUsers((prev) =>
          prev.map((item) =>
            item.id === editingUser.id
              ? {
                  ...item,
                  id: updated.id ?? updated._id ?? item.id,
                  name: updated.name ?? item.name,
                  email: updated.email ?? item.email,
                  phone: updated.phone ?? item.phone,
                  role: updated.role ?? item.role,
                  date: updated.createdAt ?? item.date,
                }
              : item
          )
        );
      }

      toast.success("Користувача оновлено");
      setIsModalOpen(false);
      setEditingUser(null);
    } catch {
      toast.error("Не вдалося оновити користувача");
    } finally {
      setIsSaving(false);
    }
  };

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
              <th className={styles.th}>Ім&apos;я</th>
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
                      {user.role === "admin"
                        ? "Адмін"
                        : user.role === "moderator"
                        ? "Модератор"
                        : "Користувач"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {new Date(user.date).toLocaleDateString("uk-UA")}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        title="Редагувати"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteUser(user.id)}
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
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        title="Редагування користувача"
      >
        <form className={styles.form} onSubmit={handleSaveUser}>
          <FormInput
            label="Ім'я"
            value={formState.name}
            onChange={(e) => updateFormState("name", e.target.value)}
            required
          />
          <FormInput
            label="Email"
            type="email"
            value={formState.email}
            onChange={(e) => updateFormState("email", e.target.value)}
            required
          />
          <FormInput
            label="Телефон"
            value={formState.phone}
            onChange={(e) => updateFormState("phone", e.target.value)}
          />
          <label className={styles.fieldGroup}>
            <span className={styles.label}>Роль</span>
            <select
              className={styles.select}
              value={formState.role}
              onChange={(e) =>
                updateFormState("role", e.target.value as UserFormState["role"])
              }
            >
              <option value="user">Користувач</option>
              <option value="customer">Клієнт</option>
              <option value="moderator">Модератор</option>
              <option value="admin">Адміністратор</option>
            </select>
          </label>
          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Збереження..." : "Зберегти"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
