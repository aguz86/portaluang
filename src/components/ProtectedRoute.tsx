
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { checkIsAuthenticated } from "../utils/auth";

export const ProtectedRoute: React.FC = () => {
  const isAuth = checkIsAuthenticated();
  
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
