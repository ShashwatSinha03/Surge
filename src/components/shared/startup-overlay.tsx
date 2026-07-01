'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import { SurgeLoader } from '@/components/ui/surge-loader';

const STORAGE_KEY = 'surge-started';

function hasStarted(): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

export function StartupOverlay() {
  const [phase, setPhase] = useState<'idle' | 'visible' | 'exiting' | 'hidden'>('idle');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (hasStarted()) {
      setPhase('hidden');
      return;
    }

    setPhase('visible');

    const timer = setTimeout(() => {
      setPhase('exiting');
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (phase === 'idle') return null;

  const isMotionSafe = !reduceMotion;

  return (
    <motion.div
      initial={isMotionSafe ? { opacity: 0 } : undefined}
      animate={
        phase === 'visible'
          ? { opacity: 1 }
          : phase === 'exiting'
            ? { opacity: 0 }
            : { opacity: 0, display: 'none' }
      }
      transition={isMotionSafe ? { duration: 0.6, ease: 'easeInOut' } : undefined}
      onAnimationComplete={() => {
        if (phase === 'exiting') setPhase('hidden');
      }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg ${phase === 'hidden' ? 'pointer-events-none' : ''}`}
      aria-hidden={phase === 'hidden'}
    >
      <SurgeLoader />
      <div className="h-8" />
      <p className="text-sm text-muted font-chillax tracking-[0.06em]">Stand by. The Surge is coming</p>
    </motion.div>
  );
}
