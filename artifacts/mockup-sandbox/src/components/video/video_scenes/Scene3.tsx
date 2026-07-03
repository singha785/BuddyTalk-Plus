import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0520] z-10"
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-[15vh] text-center w-full">
        <motion.h1 className="text-[3.5vw] font-bold text-white mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        >
          AI Pronunciation Coach
        </motion.h1>
        <motion.p className="text-[1.5vw] text-[#FF7A45]"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          Real-time scoring and feedback.
        </motion.p>
      </div>

      <div className="mt-[5vh] relative flex flex-col items-center w-[60vw]">
        {/* AI Orb Image */}
        <motion.img 
          src={`${import.meta.env.BASE_URL}ai-orb.png`}
          className="w-[15vw] h-[15vw] object-cover mix-blend-screen absolute -top-[8vw] z-0"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 0.6, rotate: 360 } : { scale: 0.5, opacity: 0 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        {/* Sentence Mockup */}
        <motion.div className="bg-[#120B32] border border-white/10 rounded-[1.5vw] p-[2vw] shadow-2xl relative z-20 w-full mb-[2vw]"
          initial={{ y: 50, opacity: 0 }}
          animate={phase >= 3 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center gap-[1vw] mb-[1.5vw]">
            <div className="w-[3vw] h-[3vw] rounded-full bg-primary/20 flex items-center justify-center text-primary text-[1.2vw]">
              🔊
            </div>
            <p className="text-[2vw] text-white/60">Listen & Repeat</p>
          </div>
          
          <div className="text-[3vw] font-medium leading-tight tracking-tight flex flex-wrap gap-[0.5vw]">
            {["I", "am", "learning", "to", "speak", "fluently"].map((word, i) => (
              <motion.span key={i}
                className={i === 4 ? "text-green-400" : i === 5 ? "text-yellow-400 border-b-2 border-yellow-400/50" : "text-white"}
                initial={{ opacity: 0, y: 10 }}
                animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Score Mockup */}
        <motion.div className="flex gap-[2vw] w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex-1 bg-[#120B32] border border-white/10 rounded-[1.5vw] p-[1.5vw] flex items-center justify-between">
            <span className="text-[1.2vw] text-white/60">Pronunciation Score</span>
            <span className="text-[2.5vw] font-bold text-green-400">92%</span>
          </div>
          <div className="flex-1 bg-[#120B32] border border-white/10 rounded-[1.5vw] p-[1.5vw] flex items-center justify-between">
            <span className="text-[1.2vw] text-white/60">Fluency</span>
            <span className="text-[2.5vw] font-bold text-[#FF7A45]">88%</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
