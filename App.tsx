
import React, { useRef, useState } from 'react';
import { HologramScene } from './components/Scene';
import { GestureController } from './components/GestureController';
import { GestureState } from './types';
import { Music, Maximize } from 'lucide-react';

// Default initial state
const defaultGestureState: GestureState = {
  isOpen: true,
  isFingerHeart: false,
  rotationTargetY: 0,
  rotationTargetX: 0,
  handDetected: false,
};

function App() {
  const gestureStateRef = useRef<GestureState>(defaultGestureState);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans select-none">
      <HologramScene gestureRef={gestureStateRef} />
      <GestureController gestureStateRef={gestureStateRef} />

      <div className="absolute top-0 left-0 p-6 z-40 text-white pointer-events-none">
        <h1 className="text-4xl font-light tracking-[0.2em] mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500 drop-shadow-[0_0_10px_rgba(255,50,80,0.8)]">
          永恒之心
        </h1>
        <p className="text-gray-400 text-sm font-light tracking-wide max-w-lg leading-relaxed">
          张开手掌: <span className="text-pink-400">扩散 & 流动</span> • 
          握拳: <span className="text-red-500">凝聚 & 跳动</span> • 
          竖大拇指: <span className="text-red-600">玫瑰风暴</span> •
          移动手掌: <span className="text-blue-400">旋转视角</span>
        </p>

        <div className="mt-6 flex gap-3 pointer-events-auto">
          <label className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full cursor-pointer hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300 backdrop-blur-md">
            <Music size={16} className="text-gray-300 group-hover:text-red-400" />
            <span className="text-sm text-gray-300 group-hover:text-white">上传音乐</span>
            <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
          </label>
          
          <button 
            onClick={toggleFullScreen}
            className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full cursor-pointer hover:bg-blue-500/20 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-md"
          >
            <Maximize size={16} className="text-gray-300 group-hover:text-blue-400" />
            <span className="text-sm text-gray-300 group-hover:text-white">全屏显示</span>
          </button>
        </div>
      </div>
      <audio ref={audioRef} loop />
    </div>
  );
}

export default App;
