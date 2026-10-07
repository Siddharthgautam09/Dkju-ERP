'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <Card className="max-w-2xl mx-auto -xl border-teal-100">
            <CardContent className="p-8 sm:p-12 text-center">
              {/* 404 Illustration */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-teal-50 to-teal-100 rounded-full mb-6 border border-teal-100">
                  <span className="text-6xl sm:text-7xl font-bold text-teal-700">
                    404
                  </span>
                </div>
                
                {/* Islamic Decoration */}
                <div className="flex justify-center gap-2 mb-4">
                  <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent"></div>
                  <BookOpen className="h-5 w-5 text-teal-600" />
                  <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent"></div>
                </div>
              </div>

              {/* Error Message */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Page Not Found
              </h1>
              
              <p className="text-base sm:text-lg text-gray-600 mb-2">
                The page you're looking for doesn't exist or has been moved.
              </p>
              
              <p className="text-sm text-gray-500 mb-8">
                Don't worry, you can navigate back to continue your Islamic education journey.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button
                  onClick={() => router.back()}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto gap-2 hover:bg-teal-50 border-teal-200 text-teal-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Go Back
                </Button>
                
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
                >
                  <Link href="/">
                    <Home className="h-5 w-5" />
                    Go to Homepage
                  </Link>
                </Button>
              </div>

              {/* Quick Links */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-4">Quick Links</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link
                    href="/about"
                    className="text-sm text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    About Us
                  </Link>
                  <Link
                    href="/contact"
                    className="text-sm text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    Contact
                  </Link>
                  <Link
                    href="/events"
                    className="text-sm text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    Events
                  </Link>
                  <Link
                    href="/admission/form"
                    className="text-sm text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    Admission
                  </Link>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
