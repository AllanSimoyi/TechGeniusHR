import type { ComponentProps } from 'react';

import { twMerge } from 'tailwind-merge';

type Props = ComponentProps<'input'> & {
  customRef?: ComponentProps<'input'>['ref'];
  name?: string | undefined;
  label?: string | undefined;
  errors?: string[];
  required?: boolean;
  isCamo?: boolean;
};
export function TextField(props: Props) {
  const {
    customRef,
    name,
    label,
    className,
    errors,
    required,
    disabled,
    isCamo,
    type,
    ...restOfProps
  } = props;

  return (
    <div className="flex flex-col items-stretch justify-center gap-0">
      <div className={'flex flex-col items-stretch gap-0'}>
        {label && (
          <div className="flex flex-col items-start justify-center">
            <span className="text-sm font-light text-stone-600">{label}</span>
          </div>
        )}
        <div className="flex grow flex-col items-stretch">
          <input
            key={name}
            required={required}
            aria-required={required}
            ref={customRef}
            type={type || 'text'}
            name={name}
            aria-invalid={!!errors?.length}
            aria-describedby={`${name}-error`}
            disabled={disabled}
            className={twMerge(
              'w-full transition-all duration-300',
              'rounded-lg p-2 text-sm font-light outline-none',
              'border border-stone-400 hover:bg-stone-100 focus:bg-stone-100',
              isCamo && 'border border-dashed border-stone-200 bg-stone-50',
              isCamo &&
                disabled &&
                'hover:bg-transparent bg-transparent border-0',
              disabled && 'cursor-not-allowed border-stone-200 text-stone-600',
              errors?.length && 'border border-red-600',
              className,
            )}
            {...restOfProps}
          />
        </div>
      </div>
      {errors && Boolean(errors.length) && (
        <span
          className="text-sm font-semibold text-red-500"
          id={`${name}-error`}
        >
          {errors.join(', ')}
        </span>
      )}
    </div>
  );
}
