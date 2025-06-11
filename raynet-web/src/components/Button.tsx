import { ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

type Props = HTMLMotionProps<'button'> & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({ className, ...props }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className={clsx('px-4 py-2 rounded-md bg-ray-violet text-white font-medium disabled:opacity-50', className)}
      {...props}
    />
  );
}
