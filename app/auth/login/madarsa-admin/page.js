"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getUserRole, ROLES } from "@/lib/authUtils";
import { getUserLocation, logLoginDetails } from "@/lib/loggingUtils";
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
import { Users, Eye, EyeOff, Mail } from "lucide-react";
import useAuthStore from "@/lib/authStore";
import Image from "next/image";
import { toast } from "sonner";

export default function MahalAdminLogin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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
      // First, try to sign in with Firebase Auth
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password,
        );
        const userRole = await getUserRole(userCredential.user);

        let finalRole = userRole;
        let adminName = "N/A";

        if (userRole !== ROLES.MAHAL_ADMIN) {
          // If not madarsa admin in users collection, check madarsas collection
          const madarsasQuery = query(
            collection(db, "madarsas"),
            where("adminEmail", "==", formData.email),
            where("status", "==", "active"),
          );

          const snapshot = await getDocs(madarsasQuery);

          if (snapshot.empty) {
            setError(
              "Invalid credentials. Please use the correct login portal for your role.",
            );
            return;
          }

          // Found in madarsas collection, set user data
          const madarsaDoc = snapshot.docs[0];
          const madarsaData = madarsaDoc.data();
          adminName = madarsaData.adminName || "N/A";
          finalRole = "madarsa_admin";

          setUser({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: madarsaData.adminName || "Mahal Admin",
            photoURL: null,
          });

          setUserData({
            uid: userCredential.user.uid,
            email: madarsaData.adminEmail,
            fullName: madarsaData.adminName,
            role: "madarsa_admin",
            status: madarsaData.status,
            profileComplete: true,
            madarsaId: madarsaData.madarsaId || madarsaDoc.id,
            madarsaName: madarsaData.name,
            madarsaAddress: madarsaData.address,
            phone: madarsaData.adminPhone,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          });
        } else {
          // If already has MAHAL_ADMIN role, still need admin name for logging
          const madarsasQuery = query(
            collection(db, "madarsas"),
            where("adminEmail", "==", formData.email),
          );
          const snapshot = await getDocs(madarsasQuery);
          if (!snapshot.empty) {
            adminName = snapshot.docs[0].data().adminName || "N/A";
          }
        }

        // Log login for all successful logins in this path
        getUserLocation().then((location) => {
          logLoginDetails(
            userCredential.user,
            finalRole || "madarsa_admin",
            location,
            adminName,
          ).catch((err) => console.error("Logging failed:", err));
        });

        router.push("/dashboard/madarsa");
        return;
      } catch (authError) {
        // console.log('Firebase auth failed, checking madarsa database...', authError.code);
      }

      // If Firebase auth fails, check madarsas database
      const madarsasQuery = query(
        collection(db, "madarsas"),
        where("adminEmail", "==", formData.email),
        where("adminPassword", "==", formData.password),
        where("status", "==", "active"),
      );

      const snapshot = await getDocs(madarsasQuery);

      if (snapshot.empty) {
        setError("Invalid email or password. Please check your credentials.");
        return;
      }

      // Found matching madarsa admin
      const madarsaDoc = snapshot.docs[0];
      const madarsaData = madarsaDoc.data();

      // Found matching madarsa admin, create Firebase auth account
      try {
        // console.log('Creating new Firebase auth account for madarsa admin...');
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password,
        );
        // console.log('Firebase auth account created successfully');

        // Set user data in auth store
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: madarsaData.adminName || "Mahal Admin",
          photoURL: null,
        });

        setUserData({
          uid: userCredential.user.uid,
          email: madarsaData.adminEmail,
          fullName: madarsaData.adminName,
          role: "madarsa_admin",
          status: madarsaData.status,
          profileComplete: true,
          madarsaId: madarsaData.madarsaId || madarsaDoc.id,
          madarsaName: madarsaData.name,
          madarsaAddress: madarsaData.address,
          phone: madarsaData.adminPhone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });

        // Log login for newly created account
        getUserLocation().then((location) => {
          logLoginDetails(
            userCredential.user,
            "madarsa_admin",
            location,
            madarsaData.adminName,
            true,
          ).catch((err) => console.error("Logging failed:", err));
        });

        // Redirect to dashboard
        router.push("/dashboard/madarsa");
      } catch (createError) {
        console.error("Error creating Firebase auth account:", createError);
        if (createError.code === "auth/email-already-in-use") {
          // Account exists, try to sign in and then set user data
          try {
            const userCredential = await signInWithEmailAndPassword(
              auth,
              formData.email,
              formData.password,
            );

            // Set user data in auth store
            setUser({
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              displayName: madarsaData.adminName || "Mahal Admin",
              photoURL: null,
            });

            setUserData({
              uid: userCredential.user.uid,
              email: madarsaData.adminEmail,
              fullName: madarsaData.adminName,
              role: "madarsa_admin",
              status: madarsaData.status,
              profileComplete: true,
              madarsaId: madarsaData.madarsaId || madarsaDoc.id,
              madarsaName: madarsaData.name,
              madarsaAddress: madarsaData.address,
              phone: madarsaData.adminPhone,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            });
            toast.success("Login successful! Welcome back.");

            // Log login for existing account after retry
            getUserLocation().then((location) => {
              logLoginDetails(
                userCredential.user,
                "madarsa_admin",
                location,
                madarsaData.adminName,
              ).catch((err) => console.error("Logging failed:", err));
            });

            router.push("/dashboard/madarsa");
          } catch (signInError) {
            console.error(
              "Error signing in with existing account:",
              signInError,
            );
            setError(
              "Account exists but password mismatch. Please contact support.",
            );
          }
        } else {
          setError("Error creating account. Please try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-indigo-50 to-blue-50 flex items-center flex-col justify-center p-4 relative overflow-hidden">
      <div className="flex w-full md:w-fit items-center bg-teal-700 p-2 rounded-lg space-x-3 mb-4 md:fixed top-5 left-5 ">
        <div className="w-12 h-12 bg-gradient-to-br from-teal-200 to-white rounded-xl flex items-center justify-center shadow-lg">
          <Image src={"/logo.png"} alt="Logo" width={48} height={48} />
        </div>
        <div>
          <span className="text-xl font-bold  text-white">DKJU</span>
          <p className="text-xs text-teal-100">Smart Islamic Education</p>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full bg-gradient-to-r from-teal-100/20 to-blue-100/20"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold text-center">
              Sadar Admin Login
            </CardTitle>
            <CardDescription className="text-center text-teal-100">
              Enter your credentials to manage your madrasa
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
                  placeholder="admin@madarsa.com"
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

            <div className="mt-8 space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Access other portals:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Link
                    href="/auth/login/student"
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-800 font-medium transition-colors"
                  >
                    Student Portal
                  </Link>
                  <Link
                    href="/auth/login/teacher"
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-medium transition-colors"
                  >
                    Teacher Portal
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
        </div>
        <div className="flex  bottom-0 w-full items-center text-center mt-8 justify-center  py-4  bg-teal-900">
          <span className="text-sm text-white">
            {"Contact technical Support : 8891177850"}
          </span>
        </div>
      </div>
    </div>
  );
}
