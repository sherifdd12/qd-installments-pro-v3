import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const AuthLayout = () => {
  const { session, user, isLoading } = useAuth();

  // Show a loading state while the session is being fetched
  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Skeleton className="h-12 w-1/2" />
        </div>
    );
  }

  // If there is no user session after loading, redirect to the login page
  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  // If there is a user session, render the nested routes
  return <Outlet />;
};

export default AuthLayout;
