"use client";
import React from "react";
import CameraCapture from "@/components/PhotoCapture";

export default function TestCameraPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Camera Capture Test</h1>
      <CameraCapture />
    </div>
  );
}