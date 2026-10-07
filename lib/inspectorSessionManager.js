import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { toast } from 'sonner';

/**
 * Inspector Session Manager
 * Handles session timing and automatic logout for inspectors
 */

class InspectorSessionManager {
  constructor() {
    this.sessionTimer = null;
    this.warningTimer = null;
    this.sessionListener = null;
    this.userId = null;
    this.allowedTime = null;
    this.isActive = false;
  }

  /**
   * Start session for inspector
   * @param {string} userId - Inspector user ID
   * @param {number} allowedTime - Session time in minutes
   */
  async startSession(userId, allowedTime) {
    this.userId = userId;
    this.allowedTime = allowedTime;
    this.isActive = true;

    const sessionStartTime = new Date();
    const sessionEndTime = new Date(sessionStartTime.getTime() + (allowedTime * 60 * 1000));

    try {
      // Update user document with session info
      await updateDoc(doc(db, 'users', userId), {
        sessionStartTime,
        sessionEndTime,
        active: true,
        lastActivity: sessionStartTime
      });

      // Start session timer
      this.startSessionTimer(allowedTime);

      // Start listening for session updates
      this.startSessionListener(userId);

      console.log(`Inspector session started: ${allowedTime} minutes`);
      toast.success(`Session started. Auto-logout in ${allowedTime} minutes.`);

    } catch (error) {
      console.error('Error starting inspector session:', error);
      toast.error('Failed to start session');
    }
  }

  /**
   * Start the session timer
   * @param {number} allowedTime - Session time in minutes
   */
  startSessionTimer(allowedTime) {
    const sessionDuration = allowedTime * 60 * 1000; // Convert to milliseconds
    const warningTime = Math.max(300000, sessionDuration * 0.1); // 5 minutes or 10% of session, whichever is greater

    // Set warning timer (warn 5 minutes before expiry)
    this.warningTimer = setTimeout(() => {
      const remainingMinutes = Math.ceil(warningTime / 60000);
      toast.warning(`Session will expire in ${remainingMinutes} minutes. Please save your work.`, {
        duration: 10000,
      });
    }, sessionDuration - warningTime);

    // Set main session timer
    this.sessionTimer = setTimeout(async () => {
      await this.endSession();
    }, sessionDuration);
  }

  /**
   * Listen for session status changes in Firestore
   * @param {string} userId - Inspector user ID
   */
  startSessionListener(userId) {
    this.sessionListener = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        // If session was ended by admin or expired
        if (!data.active && this.isActive) {
          this.forceLogout();
        }

        // Check if session time has been updated
        if (data.sessionEndTime && this.isActive) {
          const now = new Date();
          const endTime = data.sessionEndTime.toDate();
          
          if (now >= endTime) {
            this.endSession();
          }
        }
      }
    });
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity() {
    if (this.userId && this.isActive) {
      try {
        await updateDoc(doc(db, 'users', this.userId), {
          lastActivity: new Date()
        });
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    }
  }

  /**
   * End the session normally
   */
  async endSession() {
    if (!this.isActive) return;

    this.isActive = false;
    this.clearTimers();

    try {
      // Update user document
      await updateDoc(doc(db, 'users', this.userId), {
        active: false,
        sessionEndTime: new Date(),
        lastActivity: new Date()
      });

      toast.error('Session expired. You will be logged out.', {
        duration: 5000,
      });

      // Logout user
      setTimeout(async () => {
        await this.logout();
      }, 2000);

    } catch (error) {
      console.error('Error ending session:', error);
      await this.logout();
    }
  }

  /**
   * Force logout (called when session is ended externally)
   */
  async forceLogout() {
    this.isActive = false;
    this.clearTimers();

    toast.error('Your session has been terminated by an administrator.', {
      duration: 5000,
    });

    setTimeout(async () => {
      await this.logout();
    }, 2000);
  }

  /**
   * Extend session (if needed in future)
   * @param {number} additionalMinutes - Additional time in minutes
   */
  async extendSession(additionalMinutes) {
    if (!this.isActive || !this.userId) return;

    try {
      const newEndTime = new Date(Date.now() + (additionalMinutes * 60 * 1000));
      
      await updateDoc(doc(db, 'users', this.userId), {
        sessionEndTime: newEndTime
      });

      // Restart timer with new duration
      this.clearTimers();
      const remainingTime = Math.ceil((newEndTime - new Date()) / 60000);
      this.startSessionTimer(remainingTime);

      toast.success(`Session extended by ${additionalMinutes} minutes.`);

    } catch (error) {
      console.error('Error extending session:', error);
      toast.error('Failed to extend session');
    }
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.sessionListener) {
      this.sessionListener();
      this.sessionListener = null;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await signOut(auth);
      // Redirect will be handled by auth state listener
      window.location.href = '/auth/login/inspector';
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect even if logout fails
      window.location.href = '/auth/login/inspector';
    }
  }

  /**
   * Stop session manager
   */
  stopSession() {
    this.isActive = false;
    this.clearTimers();
  }
}

// Export singleton instance
export const inspectorSessionManager = new InspectorSessionManager();

/**
 * Activity tracker for updating last activity
 */
export const startActivityTracking = () => {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  const updateActivity = () => {
    inspectorSessionManager.updateActivity();
  };

  // Track user activity
  events.forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });

  // Clean up function
  return () => {
    events.forEach(event => {
      document.removeEventListener(event, updateActivity);
    });
  };
};