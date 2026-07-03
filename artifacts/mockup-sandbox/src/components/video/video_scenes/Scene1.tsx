import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const variants = {
    clipExpand: {
      initial: { clipPath: 'circle(0% at 50% 50%)' },
      animate: { clipPath: 'circle(150% at 50% 50%)' },
      exit: { clipPath: 'circle(0% at 50% 50%)', opacity: 0 }
    }
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0520]/80 backdrop-blur-sm z-10"
      variants={variants.clipExpand}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col items-center justify-center text-center relative z-20">
        <motion.div className="overflow-hidden mb-6">
          <motion.h2 className="text-[2.5vw] font-medium text-white/50 tracking-wider"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: 0 } : { y: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Struggling with English?
          </motion.h2>
        </motion.div>

        <motion.div className="overflow-hidden">
          <motion.h1 className="text-[6vw] font-black text-white leading-none tracking-tight flex"
             initial={{ opacity: 0, scale: 0.9, y: 40 }}
             animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 40 }}
             transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Speak Confidently.
          </motion.h1>
        </motion.div>
        
        <motion.div className="w-[100px] h-[4px] bg-[#FF7A45] mt-8"
          initial={{ scaleX: 0 }}
          animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      
      {/* Decorative abstract elements */}
      <motion.div className="absolute top-[30%] left-[20%] w-32 h-32 rounded-full border border-white/5"
        animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div className="absolute bottom-[20%] right-[20%] w-48 h-48 rounded-full border border-primary/20"
        animate={{ y: [0, 30, 0], rotate: [0, 45, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
