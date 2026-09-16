import { FileText,ShieldCheck } from "lucide-react";
import { FormEvent,useState } from "react";
import { ApiError, request } from "../api/client";
import type { Role } from "../types";
import { Logo } from "./Logo";

export function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [role, setRole] = useState<Role>("ADMIN");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isOrderAdmin = role === "ORDER_ADMIN";

  function selectRole(nextRole: Role) {
    setRole(nextRole);
    setUser("");
    setPassword("");
    setError("");
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const username = user.trim();

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          role,
        }),
      });

      onLogin(data.user.role);
    } catch (error) {
      setError(error instanceof ApiError
        ? error.status === 401
          ? "Invalid username, password, or login type."
          : error.status === 400
            ? "Check your username, password, and login type."
            : error.status === 429
              ? "Too many sign-in attempts. Please try again later."
              : "Sign-in is temporarily unavailable. Please try again shortly."
        : "Cannot reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={`login ${isOrderAdmin ? "purple" : ""}`}>
      <section className="login-card">
        <div className="welcome">
          <Logo />

          <h1>WELCOME TO <br></br>RENGAS BORONG</h1>

        </div>

        <form onSubmit={submit} autoComplete="off">
          <p className="eyebrow">
            SELECT LOGIN TYPE AND ENTER CREDENTIALS
          </p>

          <div className="roles">
            <button
              type="button"
              className={role === "ADMIN" ? "active" : ""}
              onClick={() => selectRole("ADMIN")}
              disabled={isLoading}
            >
              <ShieldCheck />
              ADMIN
            </button>

            <button
              type="button"
              className={isOrderAdmin ? "active" : ""}
              onClick={() => selectRole("ORDER_ADMIN")}
              disabled={isLoading}
            >
              <FileText />
              ORDER MANAGEMENT
            </button>
          </div>

          <label>
            USERNAME

            <input
              key={`username-${role}`}
              type="text"
              name={`rengas-username-${role.toLowerCase()}`}
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Enter username"
              autoComplete="off"
              disabled={isLoading}
            />
          </label>

          <label>
            PASSWORD

            <input
              key={`password-${role}`}
              type="password"
              name={`rengas-password-${role.toLowerCase()}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="new-password"
              disabled={isLoading}
            />
          </label>

          {error && (
            <small className="form-error" role="alert">
              {error}
            </small>
          )}

          <button
            type="submit"
            className="primary"
            disabled={isLoading}
          >
            {isLoading
              ? "LOGGING IN..."
              : `LOGIN AS ${
                  isOrderAdmin
                    ? "ORDER MANAGEMENT"
                    : "ADMIN"
                }`}
          </button>
        </form>
      </section>
    </main>
  );
}
