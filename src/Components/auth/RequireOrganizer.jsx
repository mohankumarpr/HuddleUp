import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../LoadingSpinner";

export default function RequireOrganizer({ children }) {
  const { loading, isOrganizer } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!isOrganizer) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
