export const spring = {
  type: 'spring',
  stiffness: 280,
  damping: 20,
};

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] },
};
