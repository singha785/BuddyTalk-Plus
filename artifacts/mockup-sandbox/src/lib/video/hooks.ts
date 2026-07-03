import { useState, useEffect, useRef } from 'react';

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);
  
  useEffect(() => {
    const keys = Object.keys(durations);
    if (keys.length === 0) return;
    
    // @ts-ignore
    window.startRecording?.();
    
    let isFirstPass = true;
    let currentIdx = 0;
    let timeout: ReturnType<typeof setTimeout>;
    
    const playNext = () => {
      const duration = durations[keys[currentIdx]];
      timeout = setTimeout(() => {
        currentIdx++;
        if (currentIdx >= keys.length) {
          if (isFirstPass) {
            // @ts-ignore
            window.stopRecording?.();
            isFirstPass = false;
          }
          currentIdx = 0;
        }
        setCurrentScene(currentIdx);
        playNext();
      }, duration);
    };
    
    playNext();
    
    return () => clearTimeout(timeout);
  }, [JSON.stringify(durations)]);
  
  return { currentScene };
}
