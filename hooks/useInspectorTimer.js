"use client";

import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { inspectorSessionManager, startActivityTracking } from "@/lib/inspectorSessionManager";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const useInspectorTimer = (userData) => {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer color based on remaining time
  const getTimerColor = (seconds) => {
    const minutes = seconds / 60;
    if (minutes <= 5) return 'text-red-600';
    if (minutes <= 15) return 'text-orange-600';
    return 'text-green-600';
  };

  // Handle rules acknowledgment and start timer
  const handleRulesAcknowledged = useCallback(async () => {
    localStorage.setItem(`inspector_rules_seen_${userData.uid}`, 'true');
    setShowRulesDialog(false);
    
    if (!userData?.uid) return;

    try {
      // Fetch allowedTime from Firestore
      const userDocRef = doc(db, 'users', userData.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userDocData = userDocSnap.data();
        const allowedTimeMinutes = userDocData?.allowedTime || 60;
        
        console.log('🚀 Starting session after rules acknowledgment');
        
        // Set session data
        localStorage.setItem(`inspector_session_${userData.uid}`, 'active');
        localStorage.setItem(`inspector_session_start_${userData.uid}`, Date.now().toString());
        
        // Calculate and store session end time
        const sessionEndTime = new Date(Date.now() + (allowedTimeMinutes * 60 * 1000));
        localStorage.setItem(`inspector_session_end_${userData.uid}`, sessionEndTime.getTime().toString());
        
        // Start inspector session manager
        inspectorSessionManager.startSession(userData.uid, allowedTimeMinutes);
        
        // Start activity tracking
        startActivityTracking();
        
        // Set session as active
        setSessionActive(true);
        
        // Set initial time remaining
        const remaining = Math.max(0, Math.ceil((sessionEndTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
        
        console.log('✅ Session started! Time remaining:', remaining);
        toast.success('Welcome! Your inspection session has started.');
      }
    } catch (error) {
      console.error('Error starting session after acknowledgment:', error);
      toast.error('Failed to start session. Please try again.');
    }
  }, [userData?.uid]);

  // Helper functions - defined before useEffect to avoid initialization errors
  const handleSessionExpiry = useCallback(async () => {
    console.log('Session expired');
    setSessionActive(false);
    
    try {
      if (userData?.uid) {
        await updateDoc(doc(db, 'users', userData.uid), {
          active: false,
          sessionEndTime: new Date(),
          lastActivity: new Date(),
          logoutReason: 'session_expired'
        });
        
        // Clear session data
        localStorage.removeItem(`inspector_session_${userData.uid}`);
        localStorage.removeItem(`inspector_session_start_${userData.uid}`);
        localStorage.removeItem(`inspector_session_end_${userData.uid}`);
      }
    } catch (error) {
      console.error('Error updating session on expiry:', error);
    }
    
    inspectorSessionManager.stopSession();
    toast.error('Session expired! You will be logged out.');
    
    setTimeout(() => {
      router.push('/auth/login/inspector');
    }, 2000);
  }, [userData?.uid, router]);

  const handleRefreshLogout = useCallback(async () => {
    console.log('Handling refresh logout');
    try {
      if (userData?.uid) {
        await updateDoc(doc(db, 'users', userData.uid), {
          active: false,
          sessionEndTime: new Date(),
          lastActivity: new Date(),
          logoutReason: 'page_refresh'
        });
        
        // Clear all session data
        localStorage.removeItem(`inspector_session_${userData.uid}`);
        localStorage.removeItem(`inspector_session_start_${userData.uid}`);
        localStorage.removeItem(`inspector_session_end_${userData.uid}`);
        localStorage.removeItem(`inspector_rules_seen_${userData.uid}`);
      }
    } catch (error) {
      console.error('Error during refresh logout:', error);
    }
    
    inspectorSessionManager.stopSession();
    toast.error('Session terminated due to page refresh. Redirecting to login...');
    
    setTimeout(() => {
      router.push('/auth/login/inspector');
    }, 1500);
  }, [userData?.uid, router]);

  useEffect(() => {
    // Enhanced refresh detection using beforeunload event
    const handleBeforeUnload = (e) => {
      if (sessionActive && userData?.uid) {
        // Only show refresh warning if session has been active for more than 2 minutes
        const sessionStart = localStorage.getItem(`inspector_session_start_${userData.uid}`);
        if (sessionStart) {
          const timeElapsed = Date.now() - parseInt(sessionStart);
          const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes in milliseconds
          
          if (timeElapsed > twoMinutesInMs) {
            // Set a flag to indicate a refresh is happening
            localStorage.setItem(`inspector_refresh_${userData.uid}`, 'true');
            
            // Show warning message
            e.preventDefault();
            e.returnValue = 'WARNING: Refreshing this page will log you out and end your inspection session. Are you sure?';
            return e.returnValue;
          }
        }
      }
    };

    // Check for refresh flag on page load - only if session has been active for more than 2 minutes
    if (userData?.uid) {
      const refreshFlag = localStorage.getItem(`inspector_refresh_${userData.uid}`);
      const sessionStart = localStorage.getItem(`inspector_session_start_${userData.uid}`);
      
      if (refreshFlag === 'true' && sessionStart) {
        const timeElapsed = Date.now() - parseInt(sessionStart);
        const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes in milliseconds
        
        if (timeElapsed > twoMinutesInMs) {
          // User refreshed despite warning after 2 minutes - logout immediately
          console.log('Refresh flag detected after 2 minutes - user refreshed after warning');
          localStorage.removeItem(`inspector_refresh_${userData.uid}`);
          handleRefreshLogout();
          return;
        } else {
          // Session is too new, just remove the refresh flag and continue normally
          console.log('Refresh detected but session is less than 2 minutes old - allowing refresh');
          localStorage.removeItem(`inspector_refresh_${userData.uid}`);
        }
      }
    }

    // Handle page unload (when user closes tab or navigates away)
    const handleUnload = () => {
      if (sessionActive && userData?.uid) {
        // Clean refresh flag on normal navigation
        localStorage.removeItem(`inspector_refresh_${userData.uid}`);
        
        // Use sendBeacon for more reliable delivery
        navigator.sendBeacon('/api/logout-inspector', JSON.stringify({
          userId: userData.uid,
          reason: 'page_close'
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [sessionActive, userData?.uid, handleRefreshLogout]);

  // Session timer effect
  useEffect(() => {
    let timerInterval;

    const setupSession = async () => {
      console.log('useInspectorTimer - useEffect triggered');
      console.log('userData:', userData);
      console.log('userData?.uid:', userData?.uid);

      if (!userData || !userData.uid) {
        console.log('Not starting session - missing userData or uid');
        return;
      }

      try {
        // Fetch allowedTime directly from Firestore user document
        console.log('🔍 Fetching allowedTime from Firestore for user:', userData.uid);
        const userDocRef = doc(db, 'users', userData.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          console.log('❌ User document not found in Firestore');
          return;
        }
        
        const userDocData = userDocSnap.data();
        // allowedTime is stored in minutes in Firestore
        const allowedTimeMinutes = userDocData?.allowedTime || 60; // Default to 60 minutes
        const allowedTimeSeconds = allowedTimeMinutes * 60; // Convert to seconds for calculations
        
        console.log('✅ Fetched allowedTime from Firestore:', {
          allowedTimeMinutes: allowedTimeMinutes,
          allowedTimeSeconds: allowedTimeSeconds
        });

        // Get navigation type for session management
        const navigationEntries = performance.getEntriesByType('navigation');
        const navigationType = navigationEntries[0]?.type;
        console.log('🔍 Navigation type:', navigationType);

        // Enhanced refresh detection
        const isPageRefresh = () => {
          // Method 1: Check navigation type
          console.log('🔍 Checking navigation type for refresh...');
          
          // Method 2: Check existing session
          const existingSession = localStorage.getItem(`inspector_session_${userData.uid}`);
          const sessionStartTime = localStorage.getItem(`inspector_session_start_${userData.uid}`);
          
          console.log('🔍 Existing session:', existingSession);
          console.log('🔍 Session start time:', sessionStartTime);
          
          // Only consider it a problematic refresh if:
          // 1. Navigation type is reload AND
          // 2. We have an existing session AND
          // 3. The session has been active for more than 2 minutes
          let isRefresh = false;
          if (navigationType === 'reload' && existingSession && sessionStartTime) {
            const timeElapsed = Date.now() - parseInt(sessionStartTime);
            const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes in milliseconds
            
            if (timeElapsed > twoMinutesInMs) {
              isRefresh = true;
              console.log('🔍 Is problematic page refresh after 2 minutes?', isRefresh);
            } else {
              console.log('🔍 Reload detected but session is less than 2 minutes old - allowing');
            }
          }
          
          console.log('🔍 Final refresh decision:', isRefresh);
          return isRefresh;
        };
        
        // Check for existing session
        const existingSession = localStorage.getItem(`inspector_session_${userData.uid}`);
        const sessionEndTimeStored = localStorage.getItem(`inspector_session_end_${userData.uid}`);
        
        console.log('🔍 Checking refresh detection...');
        const refreshDetected = isPageRefresh();
        
        if (refreshDetected) {
          // This is a page refresh with an active session - logout immediately
          console.log('❌ Page refresh detected - logging out');
          handleRefreshLogout();
          return;
        } else {
          console.log('✅ No refresh detected - proceeding with session setup');
        }
        
        // Start new session or continue existing valid session
        if (!existingSession) {
          // Fresh login - check if rules need to be shown
          console.log('🆕 Fresh login detected');
          
          // Clear any existing refresh flags from previous sessions
          localStorage.removeItem(`inspector_refresh_${userData.uid}`);
          
          // Show rules dialog on first login - timer will start after acknowledgment
          const hasSeenRules = localStorage.getItem(`inspector_rules_seen_${userData.uid}`);
          if (!hasSeenRules) {
            console.log('📋 Showing rules dialog - timer will start after acknowledgment');
            setShowRulesDialog(true);
            // Don't start timer yet - wait for rules acknowledgment
          } else {
            // User has already seen rules, start session immediately
            console.log('✅ User has seen rules before, starting session immediately');
            localStorage.setItem(`inspector_session_${userData.uid}`, 'active');
            localStorage.setItem(`inspector_session_start_${userData.uid}`, Date.now().toString());
            
            // Calculate session end time
            const sessionEndTime = new Date(Date.now() + (allowedTimeMinutes * 60 * 1000));
            localStorage.setItem(`inspector_session_end_${userData.uid}`, sessionEndTime.getTime().toString());
            
            inspectorSessionManager.startSession(userData.uid, allowedTimeMinutes);
            
            // Start activity tracking
            startActivityTracking();
            
            setSessionActive(true);
            console.log('Session will end at:', sessionEndTime);
          }

        } else if (existingSession === 'active' && sessionEndTimeStored) {
          // Continue existing session - page navigation within inspector portal
          console.log('🔄 Continuing existing session - page navigation');
          
          // Start activity tracking
          startActivityTracking();
          
          // Calculate remaining time from stored session end time
          const sessionEndTime = new Date(parseInt(sessionEndTimeStored));
          const now = new Date();
          const remaining = Math.max(0, Math.ceil((sessionEndTime - now) / 1000));
          
          console.log('Continuing session, time remaining:', remaining);
          
          if (remaining <= 0) {
            // Session already expired
            console.log('⏰ Session already expired');
            handleSessionExpiry();
            return;
          }
          
          setSessionActive(true); // Timer will start via separate effect
          
        } else {
          // Invalid session state
          console.log('❌ Invalid session state, logging out');
          handleSessionExpiry();
          return;
        }
        
      } catch (error) {
        console.error('❌ Error fetching allowedTime from Firestore:', error);
        // Use default fallback if Firestore fetch fails
        const allowedTimeMinutes = 60; // Default to 60 minutes
        console.log('Using default allowedTime:', allowedTimeMinutes, 'minutes');
      }
    };

    setupSession();

    // No timer cleanup here - handled by separate timer effect
  }, [userData, handleSessionExpiry, handleRefreshLogout]);

  // Timer interval effect - starts when session is active
  useEffect(() => {
    let timerInterval;

    if (sessionActive && userData?.uid) {
      const sessionEndTimeStored = localStorage.getItem(`inspector_session_end_${userData.uid}`);
      
      if (sessionEndTimeStored) {
        console.log('⏱️ Starting timer interval for active session');
        
        // Update timer every second
        timerInterval = setInterval(() => {
          const sessionEndTime = new Date(parseInt(sessionEndTimeStored));
          const now = new Date();
          const remaining = Math.max(0, Math.ceil((sessionEndTime - now) / 1000));
          
          setTimeRemaining(remaining);
          
          if (remaining % 10 === 0) { // Log every 10 seconds to avoid spam
            console.log('Time remaining:', remaining);
          }
          
          if (remaining === 0) {
            console.log('⏰ Time expired!');
            handleSessionExpiry();
          }
        }, 1000);
        
        // Set initial time for immediate display
        const sessionEndTime = new Date(parseInt(sessionEndTimeStored));
        const now = new Date();
        const remaining = Math.max(0, Math.ceil((sessionEndTime - now) / 1000));
        setTimeRemaining(remaining);
      }
    }

    return () => {
      if (timerInterval) {
        console.log('🧹 Cleaning up timer interval');
        clearInterval(timerInterval);
      }
    };
  }, [sessionActive, userData?.uid, handleSessionExpiry]);

  return {
    timeRemaining,
    sessionActive,
    showRulesDialog,
    setShowRulesDialog,
    formatTimeRemaining,
    getTimerColor,
    handleRulesAcknowledged
  };
};