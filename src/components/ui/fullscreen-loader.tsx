'use client';

import { motion } from 'motion/react';
import { SurgeLoader } from '@/components/ui/surge-loader';

type FullscreenLoaderProps = {
  label?: string;
};

export function FullscreenLoader({ label }: FullscreenLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg"
    >
      <SurgeLoader label={label} />
    </motion.div>
  );
}
