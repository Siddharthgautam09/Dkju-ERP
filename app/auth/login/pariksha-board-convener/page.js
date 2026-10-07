"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getUserRole, ROLES } from "@/lib/authUtils";
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
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getUserLocation, logLoginDetails } from "@/lib/loggingUtils";

export default function ParikshaBoardConvenerLogin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First, try to sign in with existing Firebase Auth
      let userCredential;
      let isNewUser = false;

      try {
        userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password,
        );
      } catch (authError) {
        console.log("Firebase Auth failed, checking database...", authError);

        // If Firebase Auth fails, check if user exists in database
        const convenerQuery = query(
          collection(db, "pariksha_board_convener"),
          where("email", "==", formData.email.trim()),
        );

        const querySnapshot = await getDocs(convenerQuery);

        if (querySnapshot.empty) {
          setError("Invalid email or password. User not found.");
          return;
        }

        const convenerDoc = querySnapshot.docs[0];
        const convenerData = convenerDoc.data();

        // Verify password matches database
        if (convenerData.password !== formData.password) {
          setError("Invalid email or password. Please try again.");
          return;
        }

        console.log(
          "User exists in database but not in Firebase Auth. Creating Firebase Auth account...",
        );

        try {
          // Create Firebase Auth user
          userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password,
          );

          isNewUser = true;

          // Update the database record with Firebase Auth UID
          await updateDoc(doc(db, "pariksha_board_convener", convenerDoc.id), {
            firebaseAuthUid: userCredential.user.uid,
            authCreatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          console.log(
            "Firebase Auth account created successfully for existing database user",
          );
        } catch (createError) {
          console.error("Error creating Firebase Auth account:", createError);
          setError(
            "Error creating authentication account. Please contact support.",
          );
          return;
        }
      }

      const userRole = await getUserRole(userCredential.user);

      // console.log(convenerData);

      // if (convenerData.role !== "pariksha_board_convener") {
      //   setError(
      //     "Invalid credentials. Please use the correct login portal for your role."
      //   );
      //   return;
      // }

      // Fetch convener name for logging if not a new user (we already have it if new user was created)
      const convenerQuery = query(
        collection(db, "pariksha_board_convener"),
        where("email", "==", formData.email.trim()),
      );
      const convenerSnapshot = await getDocs(convenerQuery);
      let convenerName = "N/A";
      if (!convenerSnapshot.empty) {
        convenerName = convenerSnapshot.docs[0].data().name || "N/A";
      }

      // Get user location and log login details asynchronously to avoid blocking the UI
      getUserLocation().then((location) => {
        logLoginDetails(
          userCredential.user,
          userRole,
          location,
          convenerName,
          isNewUser,
        ).catch((err) => console.error("Async logging failed:", err));
      });

      toast.success("Login successful! Welcome back.");

      router.push("/dashboard/pariksha-board-convener");
    } catch (error) {
      console.error("Login error:", error);
      setError("Invalid email or password. Please try again.");
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
    <div className="min-h-screen bg-white flex items-center flex-col justify-center p-4 relative overflow-hidden">
      <div className="flex w-full md:w-fit items-center bg-teal-700 p-2 rounded-lg space-x-3 mb-4 md:fixed top-5 left-5 ">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-white rounded-xl flex items-center justify-center shadow-lg">
          <Image src={"/logo.png"} alt="Logo" width={48} height={48} />
        </div>
        <div>
          <span className="text-xl font-bold  text-white">DKJU</span>
          <p className="text-xs text-orange-100">Smart Islamic Education</p>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full bg-gradient-to-r from-orange-100/20 to-amber-100/20"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold text-center">
              Pariksha Board Convener Login
            </CardTitle>
            <CardDescription className="text-center text-orange-100">
              Enter your credentials to access the examination board portal
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert
                  variant="destructive"
                  className="bg-orange-50 border-orange-200 text-orange-800"
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
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-12 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50 focus:bg-white transition-all duration-200"
                  placeholder="convener@islamportal.com"
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
                    className="h-12 pr-12 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50 focus:bg-white transition-all duration-200"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-orange-600 transition-colors"
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
                  "Pariksha Board Convener Sign In"
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
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 font-medium transition-colors"
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
                    href="/auth/login/inspector"
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-800 font-medium transition-colors"
                  >
                    Inspector Portal
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
              {"Contact technical Support : 8891177850"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
