import { ComponentProps } from 'react';
import clsx from 'clsx';

type Props = ComponentProps<'input'>;

export default function Input(props: Props) {
  return (
    <input
      {...props}
      className={clsx(
        'border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-2 focus:ring-ray-violet',
        props.className
      )}
    />
  );
}
