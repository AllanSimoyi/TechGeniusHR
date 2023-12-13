import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

type Props = ComponentProps<'input'> & {
  noIcon?: boolean;
};
export function SearchBox(props: Props) {
  const { className, disabled, noIcon, ...restOfProps } = props;
  return (
    <div
      className={twMerge(
        'flex flex-row items-center focus-within:ring-1 focus-within:ring-zinc-400',
        'rounded-md border border-zinc-200 shadow-inner outline-none',
        'transition-all duration-200',
      )}
    >
      <input
        type="text"
        disabled={disabled}
        className={twMerge(
          'w-full bg-white p-2 text-base font-light outline-none transition-all duration-150 rounded',
          disabled &&
            'cursor-not-allowed bg-zinc-200 text-zinc-600 shadow-none',
          className,
        )}
        {...restOfProps}
      />
    </div>
  );
}
