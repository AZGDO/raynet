import { ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

type Props = HTMLMotionProps<'button'> & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({ className, ...props }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className={clsx('px-4 py-2 rounded-md bg-gradient-to-r from-ray-violet to-photon-teal text-white font-medium shadow hover:shadow-lg disabled:opacity-50', className)}
      {...props}
    />
  );
}
