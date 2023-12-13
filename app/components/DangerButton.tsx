import type { RemixLinkProps } from '@remix-run/react/dist/components';
import type { ComponentProps } from 'react';

import { Link } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';

interface GetClassNameProps
  extends Pick<ComponentProps<'button'>, 'className' | 'disabled'> {
  isIcon?: boolean;
}
function getClassName(props: GetClassNameProps) {
  const { className: inputClassName, disabled, isIcon } = props;
  const className = twMerge(
    'rounded-md transition-all duration-300 text-base text-center py-2 px-4',
    'bg-red-400 text-white hover:bg-red-600 focus:bg-red-600',
    isIcon && 'px-2',
    disabled &&
      'text-stone-400 cursor-not-allowed bg-red-400/50 hover:bg-red-400/50',
    inputClassName,
  );
  return className;
}

interface Props extends ComponentProps<'button'>, GetClassNameProps {}
export function DangerButton(props: Props) {
  const {
    className,
    children,
    type = 'button',
    disabled,
    isIcon,
    ...restOfProps
  } = props;
  return (
    <button
      type={type}
      className={getClassName({ className, disabled, isIcon })}
      children={children}
      disabled={disabled}
      {...restOfProps}
    />
  );
}

interface ButtonLinkProps
  extends ComponentProps<typeof Link>,
    RemixLinkProps,
    GetClassNameProps {}
export function SecondaryButtonLink(props: ButtonLinkProps) {
  const { children, className, isIcon, ...restOfProps } = props;
  return (
    <Link
      className={getClassName({ className, disabled: false, isIcon })}
      children={children}
      {...restOfProps}
    />
  );
}

interface ExternalLinkProps extends ComponentProps<'a'>, GetClassNameProps {}
export function SecondaryButtonExternalLink(props: ExternalLinkProps) {
  const { children, className, isIcon, ...restOfProps } = props;
  return (
    <a
      className={getClassName({ className, disabled: false, isIcon })}
      children={children}
      {...restOfProps}
    />
  );
}
