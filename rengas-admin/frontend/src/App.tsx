import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { request } from "./api/client";
import { Login } from "./components/Login";
import { Shell } from "./components/Shell";
import type { Role, ToastState } from "./types";

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [loginToast, setLoginToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request("/auth/me")
      .then((user) => setRole(user.role))
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await request("/auth/logout", { method: "POST" });
    setRole(null);
  }

  function handleLogin(loggedInRole: Role) {
    setLoginToast({
      type: "success",
      message:
        loggedInRole === "ADMIN"
          ? "Admin logged in successfully"
          : "Order Management Admin logged in successfully",
    });

    setRole(loggedInRole);
  }

  if (loading) {
    return (
      <div className="page-loading">
        <RefreshCw className="spin" />
        Checking session...
      </div>
    );
  }

  return role ? (
    <Shell
      role={role}
      onLogout={logout}
      loginToast={loginToast}
      onLoginToastShown={() => setLoginToast(null)}
    />
  ) : (
    <Login onLogin={handleLogin} />
  );
}