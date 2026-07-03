import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0520] z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1 }}
    >
      <div className="relative flex flex-col items-center justify-center w-full">
        {/* App Logo / Name */}
        <motion.div className="text-center mb-[2vw]"
          initial={{ y: 50, scale: 0.8, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, scale: 1, opacity: 1 } : { y: 50, scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center justify-center gap-[1vw] mb-[1vw]">
            <div className="w-[4vw] h-[4vw] bg-gradient-to-tr from-primary to-[#FF7A45] rounded-[1vw] flex items-center justify-center text-white text-[2vw] shadow-[0_0_30px_rgba(91,61,255,0.5)]">
              B
            </div>
            <h1 className="text-[5vw] font-black text-white tracking-tight">BuddyTalk<span className="text-[#FF7A45]">+</span></h1>
          </div>
        </motion.div>

        {/* Tagline */}
        <div className="flex gap-[1.5vw] text-[2vw] font-medium text-white/80 tracking-wide mt-[1vw]">
          {["Speak.", "Practice.", "Grow."].map((word, i) => (
            <motion.span key={i}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 20, filter: 'blur(10px)' }}
              transition={{ delay: i * 0.3, duration: 0.8 }}
              className={i === 2 ? "text-primary font-bold" : ""}
            >
              {word}
            </motion.span>
          ))}
        </div>
        
        {/* Final CTA / decorative fade */}
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-primary mix-blend-screen pointer-events-none"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: [0, 0.2, 0] } : { opacity: 0 }}
          transition={{ duration: 1.5 }}
        />
      </div>
    </motion.div>
  );
}
