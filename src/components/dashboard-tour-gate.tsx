"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const TOUR_DONE_KEY = "mc-dashboard-tour-done-v1";
const MIN_DESKTOP_WIDTH = 1024;

const DashboardTour = dynamic(
  () => import("@/components/dashboard-tour").then((m) => m.DashboardTour),
  { ssr: false },
);

/**
 * Lightweight gate that prevents loading the full tour bundle unless
 * the user is eligible to see it.
 */
export function DashboardTourGate() {
  // Tour disabled
  return null;
}
