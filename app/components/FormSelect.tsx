import type { ComponentProps } from 'react';

import { useField, useIsSubmitting } from './ActionContextProvider';
import { Select } from './Select';

type Props = ComponentProps<typeof Select> & {
  name: string;
};
export function FormSelect(props: Props) {
  const { name, defaultValue, disabled, ...restOfProps } = props;

  const { value, error: errors } = useField(name);
  const isSubmitting = useIsSubmitting();

  return (
    <Select
      name={name}
      errors={errors}
      defaultValue={typeof value === 'string' ? value : undefined}
      disabled={isSubmitting || disabled}
      {...restOfProps}
    />
  );
}
