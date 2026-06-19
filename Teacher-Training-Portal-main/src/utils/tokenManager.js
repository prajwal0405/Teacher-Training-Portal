// JWT Token Management Utility

const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

export const tokenManager = {
  // Store tokens and user data
  setTokens: (accessToken, refreshToken, user) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Get access token
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),

  // Get refresh token
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  // Get stored user data
  getUser: () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Clear all tokens and user data (logout)
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // Get Bearer token for API calls
  getBearerToken: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? `Bearer ${token}` : null;
  },

  // Decode JWT token (basic decoding - in production, verify on backend)
  decodeToken: (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Token decode error:", error);
      return null;
    }
  },

  // Check if token is expired
  isTokenExpired: (token) => {
    const decoded = tokenManager.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  }
};

// API call utility with automatic token injection
export const apiFetch = async (url, options = {}) => {
  const accessToken = tokenManager.getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // If unauthorized, try to refresh token
  if (response.status === 401 && accessToken) {
    const refreshToken = tokenManager.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch("http://localhost:5001/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          tokenManager.setTokens(data.accessToken, data.refreshToken, tokenManager.getUser());

          // Retry original request with new token
          headers.Authorization = `Bearer ${data.accessToken}`;
          return fetch(url, {
            ...options,
            headers
          });
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        tokenManager.clear();
      }
    }
  }

  return response;
};
