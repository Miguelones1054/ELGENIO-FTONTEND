"use client";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import styles from "@/styles/admin.module.css";

export default function AdministrativeContentLoginPage() {
  return (
    <div className={styles.shell}>
      <AdminLoginForm />
    </div>
  );
}
