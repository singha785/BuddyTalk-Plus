import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const tasks = [
    { title: "Greet 5 people", reward: "+10", done: true },
    { title: "Listen & Repeat", reward: "+15", done: true },
    { title: "Learn 10 new words", reward: "+20", done: false },
  ];

  return (
    <motion.div className="absolute inset-0 flex items-center px-[10vw] z-10"
      initial={{ opacity: 0, rotateY: -90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
    >
      <div className="w-[45%] relative z-20">
        <motion.div className="bg-[#120B32] border border-white/10 rounded-[2vw] p-[2vw] shadow-2xl"
          initial={{ y: 30, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <h3 className="text-[1.5vw] font-semibold text-white mb-[1.5vw]">Daily Tasks</h3>
          <div className="space-y-[1vw]">
            {tasks.map((task, i) => (
              <motion.div key={i} className="flex items-center justify-between p-[1vw] bg-[#0A0520] rounded-[1vw] border border-white/5"
                initial={{ opacity: 0, x: -20 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="flex items-center gap-[1vw]">
                  <div className={`w-[2vw] h-[2vw] rounded-full flex items-center justify-center ${task.done ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white/30'}`}>
                    {task.done ? '✓' : ''}
                  </div>
                  <span className={`text-[1.2vw] ${task.done ? 'text-white/50 line-through' : 'text-white'}`}>{task.title}</span>
                </div>
                <span className="text-[1.2vw] font-bold text-[#FF7A45] flex items-center gap-[0.5vw]">
                  <span className="text-[1vw]">🪙</span> {task.reward}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="w-[55%] pl-[5vw]">
        <motion.h1 className="text-[4vw] font-bold text-white leading-tight mb-[1.5vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          Earn Coins.<br/>
          <span className="text-primary">Talk More.</span>
        </motion.h1>
        
        <motion.p className="text-[1.5vw] text-white/60 mb-[2vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          Complete daily speaking tasks to earn coins and spend them on live mentor sessions.
        </motion.p>
        
        <motion.div className="flex gap-[2vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          <div className="bg-primary/20 border border-primary/50 rounded-[1vw] p-[1.5vw] flex-1 text-center">
            <div className="text-[1vw] text-white/70 uppercase tracking-widest mb-[0.5vw]">Premium Plan</div>
            <div className="text-[2vw] font-bold text-white mb-[0.5vw]">₹29<span className="text-[1vw] text-white/50 font-normal">/mo</span></div>
            <div className="text-[1vw] text-primary">Unlimited Minutes</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
