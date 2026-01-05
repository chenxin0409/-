
export interface GestureState {
  isOpen: boolean;       // Hand open or closed
  isFingerHeart: boolean; // New: Specific "Finger Heart" gesture
  rotationTargetY: number; // Target Y rotation (Yaw)
  rotationTargetX: number; // Target X rotation (Pitch)
  handDetected: boolean;
}

// MediaPipe global types (simplified)
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}
