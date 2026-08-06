import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import logo from "./assets/logo.png";
import wordmark from "./assets/wordmark.png";

const roles = ["Job Seeker", "Employer"];

function App() {
  const [view, setView] = useState(
    window.location.pathname.startsWith("/admin") ? "admin" : "home",
  );

  useEffect(() => {
    const onPopState = () =>
      setView(window.location.pathname.startsWith("/admin") ? "admin" : "home");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextView) {
    const nextPath = nextView === "admin" ? "/admin" : "/";
    window.history.pushState({}, "", nextPath);
    setView(nextView);
  }

  return view === "admin" ? (
    <AdminDashboard onHome={() => navigate("home")} />
  ) : (
    <WaitlistPage />
  );
}

function WaitlistPage() {
  const [form, setForm] = useState({ name: "", email: "", role: roles[0] });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [joinedEntry, setJoinedEntry] = useState(null);

  async function submitWaitlist(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Saving your spot..." });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.message || "Unable to join the waitlist.",
        });
        return;
      }

      setJoinedEntry(data.entry);
      setStatus({ type: "success", message: data.message });
    } catch {
      setStatus({
        type: "error",
        message: "Unable to reach the waitlist server.",
      });
    }
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="hero-grid">
        <section
          className="hero-copy"
          aria-label="Nuvren waitlist introduction"
        >
          <div className="eyebrow">Private beta waitlist</div>
          <h1>Join Nuvren before intelligent hiring opens up.</h1>
          <p>
            Nuvren connects ambitious talent with teams that know what they are
            looking for. Join early as a candidate or employer and get notified
            when the live site opens.
          </p>

          <div className="value-list">
            <ValueItem
              title="Clean matching"
              text="Less noise, better role fit, and stronger context before anyone starts a conversation."
            />
            <ValueItem
              title="Useful timing"
              text="Early access members are first to hear when Nuvren moves from waitlist to live access."
            />
            <ValueItem
              title="Built for both sides"
              text="Candidates and employers join the same launch queue with role-specific follow-up."
            />
          </div>
        </section>

        <section
          className="panel waitlist-panel"
          aria-label="Join the waitlist"
        >
          {joinedEntry ? (
            <Confirmation
              entry={joinedEntry}
              onReset={() => {
                setJoinedEntry(null);
                setForm({ name: "", email: "", role: roles[0] });
                setStatus({ type: "idle", message: "" });
              }}
            />
          ) : (
            <>
              <div className="panel-heading">
                <h2>Reserve your spot</h2>
                <p>
                  We will store your signup securely in the Nuvren waitlist
                  database.
                </p>
              </div>

              <form className="waitlist-form" onSubmit={submitWaitlist}>
                <label>
                  <span>Full name</span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="Alex Rivera"
                    autoComplete="name"
                    required
                  />
                </label>

                <label>
                  <span>Email address</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="alex@company.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <div className="field-group">
                  <span>I am joining as</span>
                  <div
                    className="segmented"
                    role="radiogroup"
                    aria-label="Waitlist role"
                  >
                    {roles.map((role) => (
                      <label
                        key={role}
                        className={form.role === role ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role}
                          checked={form.role === role}
                          onChange={() => setForm({ ...form, role })}
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  className="primary-button"
                  disabled={status.type === "loading"}
                  type="submit"
                >
                  {status.type === "loading" ? "Joining..." : "Join waitlist"}
                </button>

                <StatusMessage status={status} />
              </form>
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Header({ onHome }) {
  return (
    <header className="site-header">
      <button className="brand-button" type="button" onClick={onHome}>
        <img className="wordmark" src={wordmark} alt="Nuvren" />
        <img className="mark" src={logo} alt="" />
      </button>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ValueItem({ title, text }) {
  return (
    <article className="value-item">
      <span aria-hidden="true">✓</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function Confirmation({ entry, onReset }) {
  return (
    <div className="confirmation">
      <div className="success-mark" aria-hidden="true">
        ✓
      </div>
      <h2>You are on the list.</h2>
      <p>
        Thanks, {entry.name}. We saved {entry.email} as a {entry.role} signup.
      </p>
      <button className="secondary-button" type="button" onClick={onReset}>
        Register another person
      </button>
    </div>
  );
}

function AdminDashboard({ onHome }) {
  const [token, setToken] = useState(
    localStorage.getItem("nuvrenAdminToken") || "",
  );
  const [login, setLogin] = useState({ username: "", password: "" });
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const totals = useMemo(
    () => ({
      total: entries.length,
      jobSeekers: entries.filter((entry) => entry.role === "Job Seeker").length,
      employers: entries.filter((entry) => entry.role === "Employer").length,
    }),
    [entries],
  );

  useEffect(() => {
    if (token) {
      loadEntries(token, setEntries, setStatus);
    }
  }, [token]);

  async function submitLogin(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Checking admin credentials..." });

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: data.message || "Login failed." });
        return;
      }

      localStorage.setItem("nuvrenAdminToken", data.token);
      setToken(data.token);
      setStatus({ type: "success", message: "Admin login successful." });
    } catch {
      setStatus({
        type: "error",
        message: "Unable to reach the admin server.",
      });
    }
  }

  function logout() {
    localStorage.removeItem("nuvrenAdminToken");
    setToken("");
    setEntries([]);
    setStatus({ type: "idle", message: "" });
  }

  async function downloadCsv() {
    setStatus({ type: "loading", message: "Preparing CSV..." });
    const response = await fetch("/api/admin/waitlist.csv", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setStatus({ type: "error", message: "Could not download the waitlist." });
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nuvren-waitlist.csv";
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ type: "success", message: "CSV download started." });
  }

  if (!token) {
    return (
      <div className="app-shell admin-shell">
        <Header onHome={onHome} />
        <main className="admin-login-wrap">
          <section className="panel admin-login">
            <div className="panel-heading">
              <h1>Admin dashboard</h1>
            </div>
            <form className="waitlist-form" onSubmit={submitLogin}>
              <label>
                <span>Username</span>
                <input
                  value={login.username}
                  onChange={(event) =>
                    setLogin({ ...login, username: event.target.value })
                  }
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={login.password}
                  onChange={(event) =>
                    setLogin({ ...login, password: event.target.value })
                  }
                  autoComplete="current-password"
                  required
                />
              </label>
              <button
                className="primary-button"
                disabled={status.type === "loading"}
                type="submit"
              >
                Log in
              </button>
              <StatusMessage status={status} />
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell admin-shell">
      <Header onHome={onHome} />
      <main className="admin-main">
        <section className="admin-title-row">
          <div>
            <p className="eyebrow">Waitlist control</p>
            <h1>Admin dashboard</h1>
          </div>
          <div className="admin-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => loadEntries(token, setEntries, setStatus)}
            >
              Refresh
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={downloadCsv}
            >
              Download CSV
            </button>
            <button className="ghost-button" type="button" onClick={logout}>
              Log out
            </button>
          </div>
        </section>

        <div className="proof-row admin-stats">
          <Stat label="Total users" value={totals.total} />
          <Stat label="Job seekers" value={totals.jobSeekers} />
          <Stat label="Employers" value={totals.employers} />
        </div>

        <StatusMessage status={status} />

        <section className="table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Signed up</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{entry.email}</td>
                    <td>
                      <span className="role-pill">{entry.role}</span>
                    </td>
                    <td>{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
                {!entries.length && (
                  <tr>
                    <td colSpan="4" className="empty-cell">
                      No waitlist signups yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

async function loadEntries(
  token,
  setEntries,
  setStatus,
  successMessage = "Waitlist users loaded.",
) {
  setStatus({ type: "loading", message: "Loading waitlist users..." });

  try {
    const response = await fetch("/api/admin/waitlist", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("nuvrenAdminToken");
      }
      setStatus({
        type: "error",
        message: data.message || "Unable to load waitlist users.",
      });
      return;
    }

    setEntries(data.entries);
    setStatus({ type: "success", message: successMessage });
  } catch {
    setStatus({ type: "error", message: "Unable to reach the admin server." });
  }
}

function StatusMessage({ status }) {
  if (!status.message) return null;
  return <p className={`status-message ${status.type}`}>{status.message}</p>;
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Nuvren. All rights reserved.</span>
      <a href="mailto:nuvren.team@gmail.com">nuvren.team@gmail.com</a>
    </footer>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

createRoot(document.getElementById("root")).render(<App />);
