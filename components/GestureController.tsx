import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { HandGesture } from '../types';

interface GestureControllerProps {
  onGestureUpdate: (gesture: HandGesture) => void;
  sensitivity: number;
}

const GestureController: React.FC<GestureControllerProps> = ({ onGestureUpdate, sensitivity }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  
  // Keep sensitivity in a ref to access current value inside requestAnimationFrame loop
  const sensitivityRef = useRef(sensitivity);
  
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      
      setLoading(false);
      startWebcam();
    };

    initMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWebcam = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predictWebcam);
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = handLandmarkerRef.current;

    if (!video || !canvas || !landmarker) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
        // Detect
        const startTimeMs = performance.now();
        const results = landmarker.detectForVideo(video, startTimeMs);

        // Draw for feedback
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Simple visual feedback
            if (results.landmarks) {
                const drawingUtils = new DrawingUtils(ctx);
                for (const landmarks of results.landmarks) {
                    drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#d4af37", lineWidth: 2 });
                    drawingUtils.drawLandmarks(landmarks, { color: "#b91c1c", lineWidth: 1, radius: 3 });
                    
                    // Logic for Gestures
                    const gesture = analyzeGesture(landmarks, canvas.width, canvas.height);
                    onGestureUpdate(gesture);
                }
                
                if (results.landmarks.length === 0) {
                     onGestureUpdate({ 
                        isFist: false, 
                        isOpen: false, 
                        isPinch: false, 
                        isVictory: false,
                        isOne: false,
                        rotation: { x: 0, y: 0 }, 
                        detected: false 
                    });
                }
            }
        }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const analyzeGesture = (landmarks: any[], width: number, height: number): HandGesture => {
    const currentSensitivity = sensitivityRef.current;

    // MediaPipe Hands Landmarks: 
    // 0: Wrist
    // 4: Thumb Tip, 8: Index Tip, 12: Middle Tip, 16: Ring Tip, 20: Pinky Tip
    
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    // Simple helper distance squared
    const d2 = (p1: any, p2: any) => Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    
    // Check curled status
    const isFingerCurled = (tipIdx: number, mcpIdx: number) => {
        const tip = landmarks[tipIdx];
        const mcp = landmarks[mcpIdx];
        return d2(tip, wrist) < d2(mcp, wrist);
    };

    const indexCurled = isFingerCurled(8, 5);
    const middleCurled = isFingerCurled(12, 9);
    const ringCurled = isFingerCurled(16, 13);
    const pinkyCurled = isFingerCurled(20, 17);

    // Fist: All fingers curled
    const isFist = indexCurled && middleCurled && ringCurled && pinkyCurled;
    
    // Open: No fingers curled
    const isOpen = !indexCurled && !middleCurled && !ringCurled && !pinkyCurled;
    
    // Pinch: Thumb tip close to Index tip
    const pinchDist = Math.sqrt(d2(thumbTip, indexTip));
    const isPinch = pinchDist < (0.05 * currentSensitivity); 

    // Victory (Peace): Index & Middle Open, Ring & Pinky Curled
    const isVictory = !indexCurled && !middleCurled && ringCurled && pinkyCurled;

    // One (Index Up): Index Open, Middle & Ring & Pinky Curled
    const isOne = !indexCurled && middleCurled && ringCurled && pinkyCurled;

    // Rotation based on Wrist position relative to center
    // Multiply by sensitivity to increase responsiveness
    const rotX = ((wrist.x - 0.5) * 2) * currentSensitivity; 
    const rotY = ((wrist.y - 0.5) * 2) * currentSensitivity;

    return {
        isFist,
        isOpen,
        isPinch,
        isVictory,
        isOne,
        rotation: { x: rotX, y: rotY },
        detected: true
    };
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-xl overflow-hidden border-2 border-metalGold/30 shadow-[0_0_15px_rgba(212,175,55,0.3)] bg-black/50 w-32 h-24 sm:w-48 sm:h-36 transition-opacity duration-500">
      {loading && <div className="absolute inset-0 flex items-center justify-center text-metalGold text-xs">Loading AI...</div>}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-50" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
    </div>
  );
};

export default GestureController;