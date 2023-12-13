import { useMemo } from 'react';

import { AppLinks } from '~/models/links';

import { SecondaryButtonLink } from './SecondaryButton';

export default function Menu() {
  const menuItems = useMemo(() => {
    return [
      ['Employees', AppLinks.Employees],
      ['Create Employee', AppLinks.CreateEmployee],
      ['Departments', AppLinks.Departments],
      ['Create Department', AppLinks.CreateDepartment],
    ];
  }, []);

  return (
    <div className="flex flex-col items-stretch w-1/5 shadow-md min-h-[600px] rounded-md bg-white">
      <ul className="flex flex-col items-stretch p-4 gap-4">
        <span className="text-lg font-semibold px-2">Menu</span>
        {menuItems.map(([label, link]) => (
          <li key={label} className="flex flex-col items-stretch">
            <SecondaryButtonLink to={link}>{label}</SecondaryButtonLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
