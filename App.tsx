import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Experience from './components/Experience';
import GestureController from './components/GestureController';
import UIOverlay from './components/UIOverlay';
import { AppState, HandGesture } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.CLOSED);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [currentGesture, setCurrentGesture] = useState<HandGesture>({
    isFist: false,
    isOpen: false,
    isPinch: false,
    isVictory: false,
    isOne: false,
    rotation: { x: 0, y: 0 },
    detected: false
  });

  // Sound Effects
  const sounds = useMemo(() => ({
    close: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'), // Magic Chime
    scatter: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'), // Wind Whoosh
    focus: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'), // Pop
  }), []);

  // Initialize volume
  useEffect(() => {
    sounds.close.volume = 0.5;
    sounds.scatter.volume = 0.3;
    sounds.focus.volume = 0.4;
  }, [sounds]);

  // Handle State Sounds
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    const playSound = async (audio: HTMLAudioElement) => {
        try {
            audio.currentTime = 0;
            await audio.play();
        } catch (e) {
            // Audio play failed (likely no user interaction yet)
            console.debug("Audio play blocked", e);
        }
    };

    if (appState === AppState.CLOSED) playSound(sounds.close);
    else if (appState === AppState.SCATTERED) playSound(sounds.scatter);
    else if (appState === AppState.FOCUSED) playSound(sounds.focus);

  }, [appState, sounds]);

  // Handle Photo Uploads
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Explicitly type file as File to avoid 'unknown' type error in URL.createObjectURL
      const newPhotos = Array.from(e.target.files).map((file: File) => URL.createObjectURL(file));
      setPhotos(prev => [...prev, ...newPhotos].slice(-10)); // Max 10 photos
    }
  };

  // Handle Gesture Logic state transitions
  const handleGestureUpdate = useCallback((gesture: HandGesture) => {
    setCurrentGesture(gesture);
    
    // Debounce or threshold could be added here for stability, 
    // but React state updates are batched enough for this frame rate.
    
    if (!gesture.detected) return;

    if (gesture.isFist) {
      // Prioritize Close
      setAppState(AppState.CLOSED);
    } else if (gesture.isOpen) {
      // Prioritize Open / Scatter
      // Only switch if currently closed (to allow Focus state to persist unless explicitly opened)
      // Or if we want "Open" to always mean "Scatter" (exiting Focus).
      if (appState !== AppState.SCATTERED) {
          setAppState(AppState.SCATTERED);
      }
    }
    
    // Pinch/Victory/One logic handled inside Experience
  }, [appState]);

  // Default photos if none uploaded
  useEffect(() => {
    if (photos.length === 0) {
        setPhotos([
            'https://memos.heiyou.top/file/attachments/iMFhCbuUoEJTAzhmLF83cV/IMG_20210505_191637.jpg',
            'https://memos.heiyou.top/file/attachments/abdMi3JkTCQEf5ENZkWerm/IMG_20210505_191542_tigr.jpg',
            'https://memos.heiyou.top/file/attachments/nQLax4V3gytgtxEBvnjsRP/IMG_20210505_191536_tigr.jpg',
            'https://memos.heiyou.top/file/attachments/FMnMewgaQhHT3j8Dek3Vpn/IMG_20210220_112018_tigr.jpg',
            'https://memos.heiyou.top/file/attachments/aHkyMSYy6ki5Zm5DqN75bt/20250101_170255.jpg'
        ]);
    }
  }, [photos]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black selection:bg-metalGold selection:text-white">
      <Experience 
        appState={appState} 
        setAppState={setAppState}
        photos={photos}
        gesture={currentGesture}
      />
      
      <UIOverlay 
        appState={appState} 
        onUpload={handleUpload} 
        photoCount={photos.length}
        sensitivity={sensitivity}
        setSensitivity={setSensitivity}
      />
      
      <GestureController 
        onGestureUpdate={handleGestureUpdate} 
        sensitivity={sensitivity}
      />
    </div>
  );
};

export default App;