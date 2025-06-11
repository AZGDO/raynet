import { ComponentProps } from 'react';
import clsx from 'clsx';

type Props = ComponentProps<'input'>;

export default function Input(props: Props) {
  return (
    <input
      {...props}
      className={clsx(
        'border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-photon-teal transition-all duration-180 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        props.className
      )}
    />
  );
}
