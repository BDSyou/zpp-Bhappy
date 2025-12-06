import React from 'react';
import { Camera, Upload, Box, Hand, Settings2 } from 'lucide-react';
import { AppState } from '../types';

interface UIOverlayProps {
  appState: AppState;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoCount: number;
  sensitivity: number;
  setSensitivity: (val: number) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ appState, onUpload, photoCount, sensitivity, setSensitivity }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-12 z-10 text-metalGold font-serif">
      
      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">
            ZPP <span className="text-christmasRed">HAPPY</span>
            </h1>
            <p className="text-sm font-sans tracking-widest mt-2 opacity-80 uppercase">Interactive Gesture Experience</p>
        </div>
        
        {/* Upload Button */}
        <label className="group cursor-pointer flex flex-col items-center gap-2 transition-transform hover:scale-105">
            <div className="w-12 h-12 rounded-full border border-metalGold flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:bg-metalGold group-hover:text-black transition-colors">
                <Upload size={20} />
            </div>
            <span className="text-xs font-sans tracking-wider">ADD PHOTO</span>
            <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
        </label>
      </div>

      {/* Instructions / Status */}
      <div className="flex flex-col gap-4 items-center sm:items-end font-sans pointer-events-auto">
        <div className={`transition-all duration-500 transform ${appState !== AppState.CLOSED ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="bg-black/40 backdrop-blur-md border-l-2 border-metalGold p-4 rounded-r-none rounded-lg max-w-xs text-right">
                <p className="text-sm text-white/90">Mode: <span className="text-metalGold font-bold">{appState}</span></p>
                <p className="text-xs text-gray-400 mt-1">Photos Loaded: {photoCount}</p>
            </div>
        </div>

        {/* Sensitivity Control */}
        <div className="bg-black/40 backdrop-blur-md border border-metalGold/30 p-3 rounded-lg flex flex-col gap-2 w-48">
            <div className="flex items-center gap-2 text-xs text-metalGold/80">
                <Settings2 size={12} />
                <span>SENSITIVITY: {sensitivity.toFixed(1)}x</span>
            </div>
            <input 
                type="range" 
                min="0.5" 
                max="2.0" 
                step="0.1" 
                value={sensitivity} 
                onChange={(e) => setSensitivity(parseFloat(e.target.value))} 
                className="w-full accent-metalGold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs tracking-wider opacity-80 pointer-events-none">
            <div className="flex items-center gap-2 justify-end">
                <span>FIST TO CLOSE</span>
                <Box size={16} />
            </div>
            <div className="flex items-center gap-2 justify-end">
                <span>OPEN HAND TO SCATTER</span>
                <Hand size={16} />
            </div>
            <div className="flex items-center gap-2 justify-end">
                <span>PEACE (✌️) TO VIEW</span>
                <Camera size={16} />
            </div>
        </div>
      </div>
      
    </div>
  );
};

export default UIOverlay;