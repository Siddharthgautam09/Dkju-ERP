'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import useAuthStore from '@/lib/authStore';

export default function Unauthorized() {
  console.log(useAuthStore.getState().userRole);
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
            Access Denied
          </CardTitle>
          
          <CardDescription className="text-gray-600 mb-6">
            You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
          </CardDescription>
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            
            <div className="text-sm text-gray-500">
              Need help? Contact support
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}