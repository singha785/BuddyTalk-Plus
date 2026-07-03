import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '../../lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { open: 4000, build1: 4500, build2: 4500, build3: 4000, close: 3500 };

const scenePos = [
  { x: '45vw', y: '40vh', scale: 2.5, opacity: 0.7 },
  { x: '8vw',  y: '15vh', scale: 1,   opacity: 0.7 },
  { x: '75vw', y: '50vh', scale: 1.4, opacity: 0.5 },
  { x: '20vw', y: '70vh', scale: 0.8, opacity: 0.6 },
  { x: '60vw', y: '25vh', scale: 1.8, opacity: 0.3 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background text-foreground bg-[#0A0520]">
      {/* Persistent background layer */}
      <div className="absolute inset-0">
        <video 
          src={`${import.meta.env.BASE_URL}bg-particles.mp4`}
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        />
        <motion.div className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #5B3DFF, transparent)' }}
          animate={{ x: ['-20%', '50%', '10%'], y: ['20%', '40%', '10%'], scale: [1, 1.2, 0.9] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[100px] right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #FF7A45, transparent)' }}
          animate={{ x: ['10%', '-30%', '5%'], y: ['-10%', '-40%', '-20%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      </div>

      {/* Persistent midground layer */}
      <motion.div
        className="absolute w-[2px] bg-[#FF7A45]"
        animate={{
          left: ['25%', '5%', '55%', '35%', '15%'][currentScene],
          height: ['50%', '90%', '25%', '60%', '40%'][currentScene],
          top: ['20%', '10%', '30%', '20%', '30%'][currentScene],
          opacity: currentScene === 4 ? 0 : 0.6,
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute w-20 h-20 border-2 border-white/10 rounded-xl"
        animate={{
          x: ['70vw', '85vw', '10vw', '50vw', '30vw'][currentScene],
          y: ['20vh', '60vh', '30vh', '10vh', '75vh'][currentScene],
          rotate: [0, 45, 90, 135, 180][currentScene],
          scale: [1, 1, 1.5, 0.8, 1.2][currentScene],
          opacity: currentScene === 4 ? 0 : 0.4
        }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="open" />}
        {currentScene === 1 && <Scene2 key="build1" />}
        {currentScene === 2 && <Scene3 key="build2" />}
        {currentScene === 3 && <Scene4 key="build3" />}
        {currentScene === 4 && <Scene5 key="close" />}
      </AnimatePresence>
    </div>
  );
}
