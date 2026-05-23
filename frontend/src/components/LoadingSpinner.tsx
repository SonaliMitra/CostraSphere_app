import React from 'react';
import { motion } from 'framer-motion';

export const LoadingSpinner: React.FC<{ size?: string }> = ({ size = 'w-6 h-6' }) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="inline-block"
    >
      <div className={`${size} border-2 border-violet-500/30 border-t-violet-400 rounded-full`} />
    </motion.div>
  );
};
