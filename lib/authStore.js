import { create } from "zustand";
import { persist } from "zustand/middleware";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { getDocument, getDocumentsByField } from "./firestoreService";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null, // Firebase auth user
      userData: null, // User document from Firestore
      loading: true,
      initialized: false,

      // Actions
      setUser: (user) => set({ user }),
      setUserData: (userData) => set({ userData }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      // Initialize auth listener
      initializeAuth: () => {
        const state = get();

        // Check if we have a mismatch between Firebase and store state
        const firebaseUser = auth.currentUser;
        const hasMismatch = firebaseUser && !state.user;

        if (state.initialized && !hasMismatch) {
          // console.log('Auth already initialized, skipping...');
          return null;
        }

        if (hasMismatch) {
          set({ initialized: false });
        }

        // console.log('�🚀 Initializing auth listener...', {
        //   authInstance: !!auth,
        //   currentUser: auth.currentUser ? auth.currentUser.email : 'null',
        //   appReady: !!auth.app,
        //   hasMismatch
        // });

        // Check if Firebase is properly configured
        if (!auth || !auth.app) {
          console.error("❌ Firebase auth not properly initialized");
          set({ loading: false, initialized: false });
          return null;
        }

        set({ initialized: true });

        // If there's already a Firebase user but no store user, process it immediately
        if (auth.currentUser && !state.user) {
          setTimeout(() => {
            // Trigger the auth state change manually
            const currentUser = auth.currentUser;
            if (currentUser) {
              // console.log('⚡ Manually triggering auth state processing for:', currentUser.email);
              // We'll process this in the onAuthStateChanged callback below
            }
          }, 100);
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          set({ loading: true });

          if (firebaseUser) {
            // console.log('👤 Processing authenticated user:', firebaseUser.email);
            try {
              // First try to get user data from users collection
              let userDoc = await getDocument("users", firebaseUser.uid);
              let userRole = null;

              // If not found by UID, try by email in users collection
              if (!userDoc && firebaseUser.email) {
                const users = await getDocumentsByField(
                  "users",
                  "email",
                  firebaseUser.email
                );
                if (users.length > 0) {
                  userDoc = users[0];
                }
              }

              // If still not found, check teachers collection
              if (!userDoc && firebaseUser.email) {
                const teachers = await getDocumentsByField(
                  "teachers",
                  "email",
                  firebaseUser.email
                );
                if (teachers.length > 0) {
                  userDoc = teachers[0];
                  userRole = "teacher";
                }
              }

              // If still not found, check students collection
              if (!userDoc && firebaseUser.email) {
                const students = await getDocumentsByField(
                  "students",
                  "email",
                  firebaseUser.email
                );
                if (students.length > 0) {
                  userDoc = students[0];
                  userRole = "student";
                }
              }

              // If still not found, check madarsas collection for madarsa admin
              if (!userDoc) {
                // Try by UID first (if supported/linked)
                let madarsas = await getDocumentsByField(
                  "madarsas",
                  "firebaseAuthUid",
                  firebaseUser.uid
                );

                // Fallback to email
                if (madarsas.length === 0 && firebaseUser.email) {
                  madarsas = await getDocumentsByField(
                    "madarsas",
                    "adminEmail",
                    firebaseUser.email
                  );
                }

                if (madarsas.length > 0 && madarsas[0].status === "active") {
                  const madarsaData = madarsas[0];
                  userDoc = {
                    id: madarsaData.id, // Capture Firestore Doc ID
                    uid: firebaseUser.uid,
                    email: madarsaData.adminEmail,
                    fullName: madarsaData.adminName,
                    role: "madarsa_admin",
                    status: madarsaData.status,
                    profileComplete: true,
                    madarsaId: madarsaData.madarsaId || madarsas[0].id,
                    madarsaName: madarsaData.name,
                    madarsaAddress: madarsaData.address,
                    phone: madarsaData.adminPhone,
                    createdAt:
                      madarsaData.createdAt || new Date().toISOString(),
                    updatedAt:
                      madarsaData.updatedAt || new Date().toISOString(),
                  };
                  userRole = "madarsa_admin";
                }
              }

              // If still not found, check pariksha_board_convener collection
              if (!userDoc) {
                // Try by UID first (since login page sets this)
                let conveners = await getDocumentsByField(
                  "pariksha_board_convener",
                  "firebaseAuthUid",
                  firebaseUser.uid
                );

                // Fallback to email
                if (conveners.length === 0 && firebaseUser.email) {
                  conveners = await getDocumentsByField(
                    "pariksha_board_convener",
                    "email",
                    firebaseUser.email
                  );
                }

                if (conveners.length > 0 && conveners[0].isActive !== false) {
                  const convenerData = conveners[0];
                  userDoc = {
                    id: convenerData.id, // Capture Firestore Doc ID
                    uid: firebaseUser.uid,
                    email: convenerData.email,
                    fullName: convenerData.name,
                    role: "pariksha_board_convener",
                    status: "active",
                    profileComplete: true,
                    phone: convenerData.phone,
                    name: convenerData.name,
                    createdAt:
                      convenerData.createdAt || new Date().toISOString(),
                    updatedAt:
                      convenerData.updatedAt || new Date().toISOString(),
                  };
                  userRole = "pariksha_board_convener";
                }
              }

              if (userDoc) {
                // console.log('✅ User document found:', {
                //   email: userDoc.email,
                //   role: userDoc.role || userRole,
                //   collection: userRole ? (userRole === 'teacher' ? 'teachers' : userRole === 'student' ? 'students' : userRole === 'madarsa_admin' ? 'madarsas' : 'unknown') : 'users'
                // });

                console.log(userDoc);

                set({
                  user: {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                  },
                  userData: {
                    id: userDoc.id || null, // Include Firestore ID
                    uid: userDoc.uid || firebaseUser.uid,
                    email: userDoc.email,
                    fullName: userDoc.fullName || userDoc.name,
                    role: userDoc.role || userRole,
                    status: userDoc.status,
                    profileComplete: userDoc.profileComplete,
                    createdAt: userDoc.createdAt,
                    updatedAt: userDoc.updatedAt,
                    lastLogin: userDoc.lastLogin,
                    madarsaId: userDoc.madarsaId || null,
                    // Add additional fields for teachers/students/madarsa admins
                    teacherId: userDoc.teacherId || null,
                    studentId: userDoc.studentId || null,
                    classLevel: userDoc.classLevel || null,
                    class: userDoc.classLevel || null,
                    admissionNumber: userDoc.admissionNumber || null,
                    madarsaName: userDoc.madarsaName || null,
                    madarsaAddress: userDoc.madarsaAddress || null,
                    // Add inspector-specific fields
                    assignedMadarsas: userDoc.assignedMadarsas || [],
                    allowedTime: userDoc.allowedTime || 3600, // Inspector session time limit
                    name: userDoc.name || userDoc.fullName,
                    phone: userDoc.phone || null,
                  },
                  loading: false,
                });
              } else {
                // console.log('⚠️ No user document found for:', firebaseUser.email);
                set({
                  user: {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                  },
                  userData: null,
                  loading: false,
                });
              }
            } catch (error) {
              console.error("❌ Error fetching user data:", error);
              set({
                user: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                },
                userData: null,
                loading: false,
              });
            }
          } else {
            // console.log('🚫 No authenticated user (logged out or initial state)');
            set({
              user: null,
              userData: null,
              loading: false,
            });
          }
        });

        return unsubscribe;
      },

      // Clear auth state
      clearAuth: () => {
        set({
          user: null,
          userData: null,
          loading: false,
          initialized: false, // Reset initialization state
        });
      },

      // Reset auth store (useful for development/debugging)
      resetAuth: () => {
        set({
          user: null,
          userData: null,
          loading: true,
          initialized: false,
        });
      },

      // Logout
      logout: async () => {
        try {
          await signOut(auth);
        } catch (error) {
          console.error("Error during logout:", error);
        }

        set({
          user: null,
          userData: null,
          loading: false,
          initialized: false, // Reset initialization state on logout
        });
      },

      // Check if user has required role
      hasRole: (requiredRole) => {
        const { userData } = get();
        if (!userData || !userData.role) return false;

        const roleHierarchy = {
          student: 1,
          teacher: 2,
          madarsa_admin: 3,
          pariksha_board_convener: 3,
          mekhala_admin: 3,
          inspector: 3,
          central_admin: 4,
        };

        // For exact role matching (like pariksha_board_convener), check for exact match
        if (
          requiredRole === "pariksha_board_convener" ||
          requiredRole === "mekhala_admin" ||
          requiredRole === "inspector"
        ) {
          return (
            userData.role === requiredRole || userData.role === "central_admin"
          );
        }

        return roleHierarchy[userData.role] >= roleHierarchy[requiredRole];
      },

      // Refresh user data from Firestore
      refreshUserData: async () => {
        const { user } = get();
        if (!user) return null;

        set({ loading: true });
        try {
          const userDoc = await getDocument("users", user.uid);
          if (userDoc) {
            console.log(userDoc);
            const updatedUserData = {
              uid: userDoc.uid,
              email: userDoc.email,
              fullName: userDoc.fullName,
              role: userDoc.role,
              status: userDoc.status,
              profileComplete: userDoc.profileComplete,
              createdAt: userDoc.createdAt,
              updatedAt: userDoc.updatedAt,
              lastLogin: userDoc.lastLogin,
              madarsaId: userDoc.madarsaId || null,
              assignedMadarsas: userDoc.assignedMadarsas || [],
              allowedTime: userDoc.allowedTime || 3600,
              name: userDoc.name || userDoc.fullName,
              phone: userDoc.phone || null,
              teacherId: userDoc.teacherId || null,
              studentId: userDoc.studentId || null,
              classLevel: userDoc.classLevel || null,
              class: userDoc.class || userDoc.classLevel || null,
              admissionNumber: userDoc.admissionNumber || null,
              madarsaName: userDoc.madarsaName || null,
              madarsaAddress: userDoc.madarsaAddress || null,
            };
            set({ userData: updatedUserData, loading: false });
            return updatedUserData;
          }
          return null;
        } catch (error) {
          console.error("Error refreshing user data:", error);
          set({ loading: false });
          return null;
        }
      },

      // Update specific user data fields
      updateUserData: (updates) => {
        const { userData } = get();
        if (!userData) return;

        set({
          userData: {
            ...userData,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      // Store admin session temporarily (for user creation scenarios)
      tempAdminSession: null,
      storeAdminSession: () => {
        const { user, userData } = get();
        set({ tempAdminSession: { user, userData } });
      },

      // Restore admin session
      restoreAdminSession: () => {
        const { tempAdminSession } = get();
        if (tempAdminSession) {
          set({
            user: tempAdminSession.user,
            userData: tempAdminSession.userData,
            loading: false,
            tempAdminSession: null,
          });
        }
      },

      // Debug function to check current auth state
      debugAuthState: () => {
        const state = get();
        // console.log('🔍 Current Auth State:', {
        //   user: state.user,
        //   userData: state.userData,
        //   loading: state.loading,
        //   initialized: state.initialized,
        //   firebaseCurrentUser: auth.currentUser ? {
        //     uid: auth.currentUser.uid,
        //     email: auth.currentUser.email
        //   } : null
        // });
        return state;
      },

      // Force re-initialization of auth (useful when mismatch detected)
      forceReinitializeAuth: () => {
        // console.log('🔄 Force re-initializing auth...');
        set({ initialized: false, loading: true });
        return get().initializeAuth();
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        userData: state.userData,
      }),
      // Add version for migration if needed
      version: 1,
      // Merge stored state with initial state
      merge: (persistedState, currentState) => {
        // console.log('🔄 Merging persisted auth state:', {
        //   hasPersistedUser: !!persistedState?.user,
        //   hasPersistedUserData: !!persistedState?.userData
        // });
        return {
          ...currentState,
          ...persistedState,
          // Always start with loading true and not initialized
          loading: true,
          initialized: false,
        };
      },
    }
  )
);

export default useAuthStore;
