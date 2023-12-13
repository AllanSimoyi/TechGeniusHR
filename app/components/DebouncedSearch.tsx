import { useCallback } from 'react';

import useDebounce from '../hooks/useDebounce';

import { SearchBox } from './SearchBox';

export function DebouncedSearch({
  runSearch,
  ...restOfProps
}: {
  runSearch: (newValue: string) => void;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const { newValue, setNewValue } = useDebounce((newValue: string) => {
    runSearch(newValue);
  }, 800);

  const handleTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setNewValue(event.target.value);
    },
    [setNewValue],
  );

  return (
    <SearchBox
      name="search"
      placeholder="Search..."
      value={newValue}
      onChange={handleTermChange}
      {...restOfProps}
    />
  );
}
