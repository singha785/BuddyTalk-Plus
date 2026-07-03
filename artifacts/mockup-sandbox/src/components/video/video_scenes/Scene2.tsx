import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2600),
      setTimeout(() => setPhase(5), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-[10vw] z-10"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-10%', opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-1/2">
        <motion.div className="inline-block px-4 py-1 rounded-full bg-primary/20 border border-primary/50 text-primary-foreground mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-[1vw] font-semibold tracking-wider uppercase">Live Connection</span>
        </motion.div>
        
        <motion.h1 className="text-[4vw] font-bold text-white leading-[1.1] mb-6"
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Call <span className="text-[#FF7A45]">mentors</span> instantly.
        </motion.h1>
        
        <motion.p className="text-[1.5vw] text-white/70 max-w-[80%]"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          WhatsApp-style direct calls to native speakers and fellow learners worldwide.
        </motion.p>
      </div>

      <div className="w-[35%] relative flex items-center justify-center">
        {/* Mentor Card Mockup */}
        <motion.div className="w-[20vw] bg-[#120B32] rounded-[2vw] border border-white/10 p-[1.5vw] shadow-2xl relative z-20"
          initial={{ scale: 0.8, opacity: 0, rotateY: 30 }}
          animate={phase >= 3 ? { scale: 1, opacity: 1, rotateY: 0 } : { scale: 0.8, opacity: 0, rotateY: 30 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center gap-[1vw] mb-[1.5vw]">
            <div className="relative">
              <img src={`${import.meta.env.BASE_URL}mentor1.jpg`} alt="Mentor" className="w-[4vw] h-[4vw] rounded-full object-cover border-2 border-primary" />
              <motion.div className="absolute bottom-0 right-0 w-[1vw] h-[1vw] bg-green-500 rounded-full border-2 border-[#120B32]"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: 'spring' }}
              />
            </div>
            <div>
              <h3 className="text-[1.2vw] font-semibold text-white">Priya S.</h3>
              <p className="text-[0.9vw] text-white/50">Native Speaker</p>
            </div>
          </div>
          <div className="flex justify-between items-center bg-[#0A0520] p-[1vw] rounded-[1vw]">
            <span className="text-[1vw] text-white/70">Rate</span>
            <span className="text-[1vw] font-bold text-[#FF7A45] flex items-center gap-1">
              <span className="text-[0.8vw]">🪙</span> 30 / 10m
            </span>
          </div>
          
          <motion.div className="mt-[1vw] w-full bg-primary py-[0.8vw] rounded-full text-center text-white font-semibold text-[1vw]"
            initial={{ scale: 0.95 }}
            animate={phase >= 4 ? { scale: [1, 1.05, 1], backgroundColor: ['#5B3DFF', '#7A62FF', '#5B3DFF'] } : { scale: 0.95 }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            Call Now
          </motion.div>
        </motion.div>

        {/* Incoming Call Mockup */}
        <motion.div className="absolute -right-[15%] top-[10%] w-[18vw] bg-[#120B32]/90 backdrop-blur-md rounded-[2vw] border border-white/10 p-[1.5vw] shadow-2xl z-30"
          initial={{ x: 50, opacity: 0, rotateZ: 5 }}
          animate={phase >= 4 ? { x: 0, opacity: 1, rotateZ: 5 } : { x: 50, opacity: 0, rotateZ: 5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="text-center mb-[1vw]">
            <p className="text-[0.9vw] text-white/50 uppercase tracking-widest mb-[0.5vw]">Incoming Call</p>
            <img src={`${import.meta.env.BASE_URL}mentor2.jpg`} alt="Caller" className="w-[5vw] h-[5vw] rounded-full object-cover border-2 border-white/20 mx-auto mb-[0.5vw]" />
            <h3 className="text-[1.2vw] font-semibold text-white">Rahul K.</h3>
          </div>
          <div className="flex justify-center gap-[1vw]">
            <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-[1.5vw] border border-red-500/50">✕</div>
            <motion.div className="w-[3.5vw] h-[3.5vw] rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-[1.5vw] border border-green-500/50"
              animate={{ scale: [1, 1.1, 1], boxShadow: ['0 0 0 rgba(34,197,94,0)', '0 0 20px rgba(34,197,94,0.5)', '0 0 0 rgba(34,197,94,0)'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              📞
            </motion.div>
          </div>
        </motion.div>
        
        {/* Glow behind mockups */}
        <div className="absolute inset-0 bg-primary/20 blur-[50px] -z-10 rounded-full" />
      </div>
    </motion.div>
  );
}
