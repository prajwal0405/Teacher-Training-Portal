import { useState, useEffect } from "react";
import LoginPage       from "./pages/LoginPage";
import AdminDashboard  from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import { tokenManager } from "./utils/tokenManager";

export default function App() {
  const [screen, setScreen]         = useState("login");
  const [currentUser, setCurrentUser] = useState(null);

  // Check if user is already logged in on app load
  useEffect(() => {
    const user = tokenManager.getUser();
    if (user && tokenManager.isAuthenticated()) {
      setCurrentUser(user);
      setScreen(user.role === "admin" ? "admin" : "teacher");
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setScreen(user.role === "admin" ? "admin" : "teacher");
  };

  const handleLogout = () => {
    tokenManager.clear();
    setCurrentUser(null);
    setScreen("login");
  };

  if (screen === "admin")   return <AdminDashboard   user={currentUser} onLogout={handleLogout}/>;
  if (screen === "teacher") return <TeacherDashboard user={currentUser} onLogout={handleLogout}/>;
  return <LoginPage onLogin={handleLogin}/>;
}