import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDocument, getDocumentsByField, COLLECTIONS } from "./firestoreService";

export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  MAHAL_ADMIN: "madarsa_admin",
  CENTRAL_ADMIN: "central_admin",
  INSPECTOR: "inspector",
  MEKHALA_ADMIN: "mekhala_admin",
};

export const getUserRole = async (user) => {
  if (!user) return null;

  try {
    // First try to get role from custom claims (for admin-set roles)
    const idTokenResult = await user.getIdTokenResult();

    if (idTokenResult.claims.role) {
      return idTokenResult.claims.role;
    }

    // If no custom claims, get role from Firestore document
    const userDoc = await getDocument(COLLECTIONS.USERS, user.uid);
    if (userDoc && userDoc.role) {
      return userDoc.role;
    }

    // If not found by document ID, search by UID field (for legacy users)
    const usersByUid = await getDocumentsByField(COLLECTIONS.USERS, "uid", user.uid);
    if (usersByUid && usersByUid.length > 0) {
      return usersByUid[0].role;
    }

    return null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};

export const checkUserPermission = (userRole, requiredRole) => {
  const roleHierarchy = {
    [ROLES.STUDENT]: 1,
    [ROLES.TEACHER]: 2,
    [ROLES.INSPECTOR]: 3,
    [ROLES.MEKHALA_ADMIN]: 4,
    [ROLES.MAHAL_ADMIN]: 4,
    [ROLES.CENTRAL_ADMIN]: 5,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (user) {
        try {
          const userRole = await getUserRole(user);
          setUser(user);
          setRole(userRole);
        } catch (error) {
          console.error("Error setting user role:", error);
          setUser(user);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, role, loading };
};
