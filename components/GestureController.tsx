
import React, { useEffect, useRef, useState } from 'react';
import { GestureState } from '../types';

interface GestureControllerProps {
  gestureStateRef: React.MutableRefObject<GestureState>;
}

export const GestureController: React.FC<GestureControllerProps> = ({ gestureStateRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.Hands || !window.Camera) {
      setError("MediaPipe 库未加载，请检查网络连接。");
      return;
    }

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    if (!videoElement || !canvasElement) return;

    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    // Helper: Distance between two landmarks
    const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);

    const onResults = (results: any) => {
      setLoading(false);
      
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      // Mirror the video for natural interaction
      canvasCtx.translate(canvasElement.width, 0);
      canvasCtx.scale(-1, 1);
      
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        gestureStateRef.current.handDetected = true;
        const landmarks = results.multiHandLandmarks[0];
        
        // Landmarks Reference:
        // 0: Wrist
        // 4: Thumb Tip
        // 8: Index Tip
        // 12: Middle Tip
        // 16: Ring Tip
        // 20: Pinky Tip

        // Scale reference (Wrist to Middle Knuckle MCP)
        const palmScale = dist(landmarks[0], landmarks[9]); 

        // --- 1. Basic Open/Close (Pinch) Detection ---
        const thumbTip = landmarks[4];
        const middleTip = landmarks[12];
        const pinchDist = dist(thumbTip, middleTip);
        if (pinchDist / palmScale > 0.6) {
          gestureStateRef.current.isOpen = true;
        } else {
          gestureStateRef.current.isOpen = false;
        }

        // --- 2. Thumbs Up Detection (New Trigger) ---
        // Logic: 
        // 1. Thumb is extended upward (Tip y < IP y < MCP y). Note: Y increases downwards in screen coords.
        // 2. Other fingers are curled (Tip closer to wrist than PIP/MCP).
        
        // Check Curled Fingers (Index, Middle, Ring, Pinky)
        // Using comparison to wrist distance vs Knuckle distance to be safe
        const isIndexCurled = dist(landmarks[8], landmarks[0]) < dist(landmarks[5], landmarks[0]) * 1.2;
        const isMiddleCurled = dist(landmarks[12], landmarks[0]) < dist(landmarks[9], landmarks[0]) * 1.2;
        const isRingCurled = dist(landmarks[16], landmarks[0]) < dist(landmarks[13], landmarks[0]) * 1.2;
        const isPinkyCurled = dist(landmarks[20], landmarks[0]) < dist(landmarks[17], landmarks[0]) * 1.2;

        // Check Thumb Up
        // Thumb Tip(4) should be significantly higher (lower Y value) than Wrist(0) or Index Knuckle(5)
        // And Thumb Tip should be the highest point of the hand
        const isThumbTipHighest = landmarks[4].y < landmarks[8].y 
                               && landmarks[4].y < landmarks[12].y
                               && landmarks[4].y < landmarks[16].y
                               && landmarks[4].y < landmarks[20].y;
        
        // Thumb alignment check (Tip above IP joint)
        const isThumbStraightUp = landmarks[4].y < landmarks[3].y;

        let skeletonColor = '#00FF00';

        if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled && isThumbTipHighest && isThumbStraightUp) {
            gestureStateRef.current.isFingerHeart = true; // Variable reused for "Effect Active"
            skeletonColor = '#00FFFF'; // Turn Cyan when Thumbs Up detected
        } else {
            gestureStateRef.current.isFingerHeart = false;
        }

        // --- 3. Rotation Control ---
        const handX = landmarks[9].x; 
        const handY = landmarks[9].y;
        gestureStateRef.current.rotationTargetY = (0.5 - handX) * 3; 
        gestureStateRef.current.rotationTargetX = (handY - 0.5) * 2;

        // Draw Skeleton
        if (window.drawConnectors && window.drawLandmarks) {
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: skeletonColor, lineWidth: 2 });
          window.drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });
        }
      } else {
        gestureStateRef.current.handDetected = false;
        gestureStateRef.current.isOpen = true; 
        gestureStateRef.current.isFingerHeart = false;
      }
      canvasCtx.restore();
    };

    const hands = new window.Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    const camera = new window.Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 320, 
      height: 240,
    });

    camera.start()
      .then(() => setLoading(false))
      .catch((err: any) => {
        console.error(err);
        setError("无法访问摄像头");
      });

    return () => {
    };
  }, [gestureStateRef]);

  return (
    <div className="absolute bottom-5 right-5 w-64 h-48 z-50 pointer-events-none">
      <div className="relative w-full h-full border-2 border-pink-500/30 rounded-lg overflow-hidden bg-black/50 backdrop-blur-sm shadow-[0_0_20px_rgba(255,50,80,0.3)]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs text-center p-4">
            视觉系统初始化中...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs text-center p-4">
            {error}
          </div>
        )}
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
             <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
                 <span className="text-[10px] text-white/80 uppercase tracking-wider">交互系统正常</span>
             </div>
        </div>
      </div>
    </div>
  );
};
