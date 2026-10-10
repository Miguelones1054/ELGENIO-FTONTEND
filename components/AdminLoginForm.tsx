"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminSignIn } from "@/lib/admin-auth";
import { getAdminToken } from "@/lib/admin-session";
import styles from "@/styles/admin.module.css";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminToken()) {
      router.replace("/administrative-content/dashboard");
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await adminSignIn(username, password);
      router.replace("/administrative-content/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginBox}>
      {loading ? (
        <div className={styles.loginOverlay} role="status" aria-live="polite">
          <span>Ingresando</span>
        </div>
      ) : null}

      <div className={styles.loginHeader}>
        <p className={styles.loginSystem}>El Genio</p>
        <h1 className={styles.loginTitle}>Acceso administrativo</h1>
      </div>

      <div className={styles.loginBody}>
        <form className={styles.loginForm} onSubmit={onSubmit}>
          <fieldset className={styles.loginFieldset} disabled={loading}>
            <table className={styles.loginTable}>
              <tbody>
                <tr>
                  <th scope="row">
                    <label htmlFor="admin-username">Usuario</label>
                  </th>
                  <td>
                    <input
                      id="admin-username"
                      className={styles.loginInput}
                      name="username"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                    />
                  </td>
                </tr>
                <tr>
                  <th scope="row">
                    <label htmlFor="admin-password">Contraseña</label>
                  </th>
                  <td>
                    <input
                      id="admin-password"
                      className={styles.loginInput}
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {error ? <p className={styles.loginError}>{error}</p> : null}

            <div className={styles.loginActions}>
              <button className={styles.loginSubmit} type="submit" disabled={loading}>
                Ingresar
              </button>
            </div>
          </fieldset>
        </form>
      </div>

      <div className={styles.loginFooter}>
        <span>Solo personal autorizado</span>
      </div>
    </div>
  );
}
