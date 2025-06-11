import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Toast({ message, show, onHide }: { message: string; show: boolean; onHide(): void }) {
  useEffect(() => {
    if (show) {
      const id = setTimeout(onHide, 2000);
      return () => clearTimeout(id);
    }
  }, [show, onHide]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed top-2 left-1/2 -translate-x-1/2 bg-ray-violet text-white px-4 py-2 rounded"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
