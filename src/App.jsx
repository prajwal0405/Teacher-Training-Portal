import { useState, useEffect } from "react";
import LoginPage       from "./pages/LoginPage";
import AdminDashboard  from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import { getStoredSession, storeSession, clearSession } from "./services/api";
import { LANG_CHANGE_EVENT } from "./services/i18n";

export default function App() {
  const [initialSession] = useState(getStoredSession);
  const [screen, setScreen] = useState(() => {
    if (!initialSession) return "login";
    return initialSession.user.role === "admin" ? "admin" : "teacher";
  });
  const [currentUser, setCurrentUser] = useState(initialSession?.user || null);
  // Language key forces re-render of entire tree when language changes
  const [langKey, setLangKey] = useState(
    localStorage.getItem("spaceece_default_language") || "English"
  );

  useEffect(() => {
    const handler = (e) => {
      setLangKey(e.detail?.lang || localStorage.getItem("spaceece_default_language") || "English");
    };
    window.addEventListener(LANG_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handler);
  }, []);

  const handleLogin = (session) => {
    const user = session.user || session;
    if (session.token) storeSession(session);

    setCurrentUser(user);
    setScreen(user.role === "admin" ? "admin" : "teacher");
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setScreen("login");
  };

  if (screen === "admin")   return <AdminDashboard   key={`admin-${langKey}`}   user={currentUser} onLogout={handleLogout}/>;
  if (screen === "teacher") return <TeacherDashboard key={`teacher-${langKey}`} user={currentUser} onLogout={handleLogout}/>;
  return <LoginPage onLogin={handleLogin}/>;
}