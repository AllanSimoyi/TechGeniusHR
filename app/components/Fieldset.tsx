import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

export default function Fieldset(props: ComponentProps<'fieldset'>) {
  const { children, title, className, ...restOfProps } = props;
  return (
    <fieldset
      className={twMerge(
        'min-w-[500px] border border-slate-400/60 p-6 rounded-md gap-6',
        className,
      )}
      {...restOfProps}
    >
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}
