import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Get user's approximate location
 * @returns {Promise<Object>} Object containing latitude, longitude, accuracy or error
 */
export const getUserLocation = async () => {
  try {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return { error: "Geolocation not supported" };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          resolve({ error: "Location access denied or unavailable" });
        },
        { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 },
      );
    });
  } catch (error) {
    console.warn("Location error:", error);
    return { error: "Location unavailable" };
  }
};

/**
 * Log login activity to Firestore
 * @param {Object} user Firebase user object
 * @param {string} userRole Role of the user
 * @param {Object} location Location object from getUserLocation
 * @param {string} name Full name of the user
 * @param {boolean} isNewUser Whether this is a new Firebase Auth user
 */
export const logLoginDetails = async (
  user,
  userRole,
  location,
  name,
  isNewUser = false,
) => {
  try {
    const loginData = {
      userId: user.uid,
      email: user.email,
      name: name || user.displayName || "N/A",
      role: userRole,
      loginTimestamp: serverTimestamp(),
      location: location || null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
      ip: "Client-side",
      loginMethod: "email_password",
      platform: "web",
      isNewAuthUser: isNewUser,
      authCreatedDuringLogin: isNewUser,
    };

    await addDoc(collection(db, "LoginLogs"), loginData);
    console.log("Login logged successfully:", loginData);
    return true;
  } catch (error) {
    console.error("Error logging login details:", error);
    // Return false instead of throwing to avoid blocking the login flow
    return false;
  }
};
