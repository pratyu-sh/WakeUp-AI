import { DETECTION_CONFIG } from "../constants/exerciseDetection";
import type { PoseFrame } from "../pose/poseTypes";
import type { FrameMetrics } from "../exercises/poseMetrics";

export type QualityIssue =
  | "no_person"
  | "multiple_people"
  | "low_confidence"
  | "body_cropped"
  | "too_far"
  | "too_close"
  | "low_light"
  | "poor_lighting"
  | "unstable_camera";

export interface PoseQualityReport {
  okay: boolean;
  issue: QualityIssue | null;
  /** Average visibility of the tracked landmarks (proxy for lighting/occlusion). */
  confidence: number;
  /** Normalized span of the body bounding box. */
  span: number;
  /** Whether the primary subject is inside the frame with margin. */
  inFrame: boolean;
  feedback: string | null;
}

export const QUALITY_FEEDBACK: Record<QualityIssue, string> = {
  no_person: "Move into the camera frame",
  multiple_people: "Only one person in frame, please",
  low_confidence: "Better lighting needed",
  poor_lighting: "Better lighting needed — face the light",
  body_cropped: "Step back so your full body is visible",
  too_far: "Step a little closer to the camera",
  too_close: "Move a step back from the camera",
  low_light: "Better lighting needed",
  unstable_camera: "Keep the camera steady",
};

/** Frame-edge margins below which the subject is considered cropped. */
const EDGE_MARGIN = 0.04;

/**
 * Rejects frames that cannot be trusted: no person, several people, subject
 * too close/far, cropped by the frame edge, or poor lighting.
 * A rejected frame must not advance the rep machines or accrue plank time.
 */
export function evaluatePoseQuality(frame: PoseFrame, metrics: FrameMetrics): PoseQualityReport {
  const confidence = frame.overallConfidence ?? 0;
  const report: PoseQualityReport = {
    okay: true,
    issue: null,
    confidence,
    span: 0,
    inFrame: true,
    feedback: null,
  };

  if (frame.personCount === 0) {
    report.okay = false;
    report.issue = "no_person";
    report.feedback = QUALITY_FEEDBACK.no_person;
    return report;
  }
  if (frame.personCount > DETECTION_CONFIG.maxPeople) {
    report.okay = false;
    report.issue = "multiple_people";
    report.feedback = QUALITY_FEEDBACK.multiple_people;
    return report;
  }

  // Low confidence / poor illumination check
  if (confidence > 0 && confidence < DETECTION_CONFIG.minConfidence) {
    report.okay = false;
    report.issue = confidence < 0.28 ? "poor_lighting" : "low_confidence";
    report.feedback = QUALITY_FEEDBACK[report.issue];
    return report;
  }

  // Body bounding box from the visible keypoints.
  const points = [
    frame.leftShoulder,
    frame.rightShoulder,
    frame.leftHip,
    frame.rightHip,
    frame.leftAnkle,
    frame.rightAnkle,
    frame.leftKnee,
    frame.rightKnee,
  ].filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (points.length === 0) {
    report.okay = false;
    report.issue = "no_person";
    report.feedback = QUALITY_FEEDBACK.no_person;
    return report;
  }

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const span = Math.max(maxX - minX, maxY - minY);
  report.span = span;

  if (span < DETECTION_CONFIG.minBodySpanNormalized) {
    report.okay = false;
    report.issue = "too_far";
    report.feedback = QUALITY_FEEDBACK.too_far;
    return report;
  }
  if (span > DETECTION_CONFIG.maxBodySpanNormalized) {
    report.okay = false;
    report.issue = "too_close";
    report.feedback = QUALITY_FEEDBACK.too_close;
    return report;
  }

  const inFrame =
    minX >= EDGE_MARGIN && maxX <= 1 - EDGE_MARGIN && minY >= EDGE_MARGIN && maxY <= 1 - EDGE_MARGIN;
  if (!inFrame) {
    report.okay = false;
    report.issue = "body_cropped";
    report.feedback = QUALITY_FEEDBACK.body_cropped;
    return report;
  }

  // Double-check major limbs visibility
  if (confidence <= DETECTION_CONFIG.minLandmarkVisibility) {
    report.okay = false;
    report.issue = "low_confidence";
    report.feedback = QUALITY_FEEDBACK.low_confidence;
    return report;
  }

  return report;
}