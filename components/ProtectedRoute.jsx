'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/lib/authStore';

const ProtectedRoute = ({ children, requiredRole, redirectTo = '/unauthorized' }) => {
  const { user, role, loading, hasRole } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If no user and a role is required, redirect to login
      if (!user && requiredRole) {
        router.push('/auth/login/student');
        return;
      }
      
      // If user exists but doesn't have required role, redirect
      if (user && requiredRole && !hasRole(requiredRole)) {
        router.push(redirectTo);
        return;
      }
    }
  }, [user, role, requiredRole, redirectTo, router, loading, hasRole]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-600 border-t-transparent mx-auto"></div>
          <p className="text-teal-600 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If no user or role mismatch, don't render children (redirect already triggered)
  if (!user || (requiredRole && !hasRole(requiredRole))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-600 border-t-transparent mx-auto"></div>
          <p className="text-teal-600 font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;