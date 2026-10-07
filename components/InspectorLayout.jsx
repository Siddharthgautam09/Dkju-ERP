"use client";

import Layout from "@/components/Layout";
import { useInspectorTimer } from "@/hooks/useInspectorTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";
import useAuthStore from "@/lib/authStore";

const InspectorLayout = ({ children }) => {
  const { userData } = useAuthStore();
  const {
    timeRemaining,
    sessionActive,
    showRulesDialog,
    setShowRulesDialog,
    formatTimeRemaining,
    getTimerColor,
    handleRulesAcknowledged
  } = useInspectorTimer(userData);

  
  const allowedTimeSeconds = userData?.allowedTime || 3600;
  const allowedTimeMinutes = Math.floor(allowedTimeSeconds / 60);
  // Inspector rules
  const inspectorRules = [
    "You must complete your inspection within the allocated time limit.",
    "Do not refresh any page during inspection - this will log you out immediately.",
    "Take detailed notes and photos during inspection.",
    "Submit your inspection report before the session expires.",
    "Be thorough and objective in your assessment.",
    "Follow all safety protocols during site visits.",
    "Maintain confidentiality of inspection findings until official submission.",
    "Contact admin immediately if you encounter technical issues.",
    "Your session will automatically expire - save your work frequently.",
    "You will receive a warning 5 minutes before session expiry."
  ];

  return (
    <>
      <Layout 
        showTimer={true}
        timeRemaining={timeRemaining}
        sessionActive={sessionActive}
        formatTimeRemaining={formatTimeRemaining}
        getTimerColor={getTimerColor}
        allowedTime={allowedTimeMinutes}
      >
        {children}
      </Layout>

      {/* Inspector Rules Dialog */}
      <Dialog open={showRulesDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl bg-white max-h-[80vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              Inspector Guidelines & Rules
            </DialogTitle>
            <DialogDescription>
              Please read and acknowledge these important guidelines before starting your inspection session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Session Information</span>
              </div>
              <p className="text-blue-700 text-sm">
                Your inspection session is limited to <strong>{allowedTimeMinutes} hours</strong>.
                The timer will start immediately after acknowledging these rules.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Important Rules:</h3>
              <ul className="space-y-2">
                {inspectorRules.map((rule, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">Critical Warning</span>
              </div>
              <p className="text-red-700 text-sm">
                <strong>DO NOT refresh any page during inspection!</strong> This will immediately log you out and mark your session as inactive.
                Save your work frequently and complete inspections before the timer expires.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button 
                onClick={handleRulesAcknowledged}
                className="bg-teal-600 hover:bg-teal-700"
              >
                I Understand - Start Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InspectorLayout;