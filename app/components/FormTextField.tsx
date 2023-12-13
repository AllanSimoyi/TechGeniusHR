import { type ComponentProps } from 'react';
// import { useState, type ComponentProps } from 'react';

// import useDebounce from '~/hooks/useDebounce';

import { useField, useIsSubmitting } from './ActionContextProvider';
import { TextField } from './TextField';

interface Props extends ComponentProps<typeof TextField> {
  name: string;
}
export function FormTextField(props: Props) {
  const { id, name, defaultValue, disabled, ...restOfProps } = props;

  const { value, error: errors } = useField(name);
  const isSubmitting = useIsSubmitting();

  return (
    <TextField
      name={name}
      errors={errors}
      defaultValue={typeof value === 'string' ? value : undefined}
      disabled={isSubmitting || disabled}
      {...restOfProps}
    />
  );
}
