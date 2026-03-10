import {
  getToken,
  getTokenRemainingTime,
  isTokenExpired,
  logout,
} from "@/lib/auth";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = getToken();
  const location = useLocation();
  const navigate = useNavigate();

  const expired = token ? isTokenExpired(token) : true;

  useEffect(() => {
    if (!token) return;

    if (expired) {
      logout();
      return;
    }

    const remainingTime = getTokenRemainingTime(token);

    const timer = window.setTimeout(() => {
      logout();
      navigate("/login", {
        replace: true,
        state: { from: location.pathname, reason: "expired" },
      });
    }, remainingTime);

    return () => window.clearTimeout(timer);
  }, [token, expired, navigate, location.pathname]);

  if (!token || expired) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
