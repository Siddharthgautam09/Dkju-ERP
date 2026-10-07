"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  query,
  collection,
  where,
  getDocs,
  updateDoc,
  setDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Eye, EyeOff, Phone } from "lucide-react";
import useAuthStore from "@/lib/authStore";
import Header from "@/components/Header";
import Image from "next/image";
import { toast } from "sonner";
import { getUserLocation, logLoginDetails } from "@/lib/loggingUtils";
export default function StudentLogin() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setUser, setUserData } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First, check if student exists in Firestore
      const studentQuery = query(
        collection(db, "students"),
        where("email", "==", formData.email),
      );

      const studentSnapshot = await getDocs(studentQuery);

      if (studentSnapshot.empty) {
        setError("No student account found with this email address.");
        setLoading(false);
        return;
      }

      const studentDoc = studentSnapshot.docs[0];
      const studentData = studentDoc.data();

      // if (studentData.role !== 'student') {
      //   setError('This portal is not available for your role. Please use the correct portal.');
      //   setLoading(false);
      //   return;
      // }

      // Check if student is active
      if (studentData.status !== "active") {
        setError(
          "Your account is not active. Please contact the administrator.",
        );
        setLoading(false);
        return;
      }

      // Check password
      if (studentData.password !== formData.password) {
        setError("Invalid password. Please try again.");
        setLoading(false);
        return;
      }

      // Password matches, proceed with Firebase Auth
      try {
        // Try to sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password,
        );

        // Set user data in auth store
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
        });

        setUserData({
          uid: studentData.uid || userCredential.user.uid,
          email: studentData.email,
          fullName: studentData.fullName || studentData.name,
          role: studentData.role || "student",
          status: studentData.status,
          profileComplete: studentData.profileComplete || false,
          createdAt: studentData.createdAt,
          updatedAt: studentData.updatedAt,
          lastLogin: studentData.lastLogin,
          admissionNumber: studentData.admissionNumber || null,
          madarsaId: studentData.madarsaId || null,
          classLevel: studentData.classLevel || null,
          class: studentData.class || studentData.classLevel || null,
          profilePictureUrl: studentData.profilePictureUrl || null,
        });

        // Log login details asynchronously
        getUserLocation().then((location) => {
          logLoginDetails(
            userCredential.user,
            studentData.role || "student",
            location,
            studentData.fullName || studentData.name,
          ).catch((err) => console.error("Logging failed:", err));
        });

        router.push("/dashboard/student");
      } catch (signInError) {
        // If user does not exist in Firebase Auth, create the user
        if (
          signInError.code === "auth/user-not-found" ||
          signInError.code === "auth/invalid-credential"
        ) {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password,
          );

          // Set user data in auth store
          setUser({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
          });

          setUserData({
            uid: studentData.uid || userCredential.user.uid,
            email: studentData.email,
            fullName: studentData.fullName || studentData.name,
            role: studentData.role,
            status: studentData.status,
            profileComplete: studentData.profileComplete,
            createdAt: studentData.createdAt,
            updatedAt: studentData.updatedAt,
            lastLogin: studentData.lastLogin,
            studentId: studentData.studentId || null,
            admissionNumber: studentData.admissionNumber || null,
            madarsaId: studentData.madarsaId || null,
            classLevel: studentData.classLevel || null,
            class: studentData.classLevel || null,
            profilePictureUrl: studentData.profilePictureUrl || null,
          });
          toast.success("Login successful! Welcome back.");

          // Log login details for newly created auth user
          getUserLocation().then((location) => {
            logLoginDetails(
              userCredential.user,
              studentData.role || "student",
              location,
              studentData.fullName || studentData.name,
              true,
            ).catch((err) => console.error("Logging failed:", err));
          });

          router.push("/dashboard/student");
        } else {
          throw signInError;
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.message || "An error occurred during login. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(
      "Google sign-in is not available for this portal. Please use email and password.",
    );
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-green-50 to-yellow-50 flex items-center flex-col justify-center p-4 relative overflow-hidden">
      <div className="flex w-full md:w-fit items-center bg-teal-700 p-2 rounded-lg space-x-3 mb-4 md:fixed top-5 left-5 ">
        <div className="w-12 h-12 bg-gradient-to-br from-green-200 to-white rounded-xl flex items-center justify-center shadow-lg">
          <Image src={"/logo.png"} alt="Logo" width={48} height={48} />
        </div>
        <div>
          <span className="text-xl font-bold  text-white">DKJU</span>
          <p className="text-xs text-teal-100">Smart Islamic Education</p>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full bg-gradient-to-r from-teal-100/20 to-yellow-100/20"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold text-center">
              Student Login
            </CardTitle>
            <CardDescription className="text-center text-teal-100">
              Enter your credentials to continue your Islamic education journey
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 border-red-200 text-red-800"
                >
                  <AlertDescription className="font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-gray-700"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-12 border-gray-200 focus:border-teal-500 focus:ring-teal-500 bg-gray-50 focus:bg-white transition-all duration-200"
                  placeholder="student@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-gray-700"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-12 pr-12 border-gray-200 focus:border-teal-500 focus:ring-teal-500 bg-gray-50 focus:bg-white transition-all duration-200"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center  transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="my-6 hidden items-center">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-3 text-sm text-gray-500 bg-white">or</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 border-gray-200 text-gray-600 hover:bg-gray-50 hidden cursor-not-allowed opacity-60"
              disabled={true}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google (Coming Soon)
            </Button>

            <div className="mt-8 space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Access other portals:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Link
                    href="/auth/login/teacher"
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-medium transition-colors"
                  >
                    Teacher Portal
                  </Link>
                  <Link
                    href="/auth/login/madarsa-admin"
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 font-medium transition-colors"
                  >
                    Sadar Admin
                  </Link>
                  <Link
                    href="/auth/login/admin"
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 font-medium transition-colors"
                  >
                    Central Admin
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Home
          </Link>
          <div className="flex  bottom-0 w-full items-center text-center mt-8 justify-center  py-4  bg-teal-900">
            <span className="text-sm text-white">
              {"Contact technical Support : 8891177850"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
