import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from '@remix-run/node';

import { json } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import { useState, type ComponentProps, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import {
  ActionContextProvider,
  useForm,
} from '~/components/ActionContextProvider';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { DebouncedSearch } from '~/components/DebouncedSearch';
import Fieldset from '~/components/Fieldset';
import { FormSelect } from '~/components/FormSelect';
import Menu from '~/components/Menu';
import { PrimaryButton } from '~/components/PrimaryButton';
import { Toolbar } from '~/components/Toolbar';
import { prisma } from '~/db.server';
import {
  RecordStatus,
  StatusCode,
  badRequest,
  getQueryParams,
  processBadRequest,
} from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

const LoaderSchema = z.object({
  status: z.string().or(z.literal('')).optional(),
  departmentId: z.string().or(z.literal('')).optional(),
  managerId: z.string().or(z.literal('')).optional(),
});
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireUserId(request);

  const queryParams = getQueryParams<keyof z.infer<typeof LoaderSchema>>(
    request.url,
    ['status', 'departmentId', 'managerId'],
  );

  const result = LoaderSchema.safeParse(queryParams);
  if (!result.success) {
    throw new Response('Invalid input provided, please try again', {
      status: StatusCode.BadRequest,
    });
  }
  const { status, departmentId, managerId } = result.data;

  function fetchEmployees() {
    return prisma.employee
      .findMany({
        where: {
          AND: [
            { status },
            { managers: { some: { managerId } } },
            {
              managers: {
                some: {
                  manager: {
                    is: { departments: { some: { id: departmentId } } },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          status: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          managers: {
            select: {
              manager: {
                select: {
                  employeeFields: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
      })
      .then((records) =>
        records.map(({ managers, ...record }) => {
          const manager = managers.length
            ? managers[0].manager.employeeFields
            : undefined;
          const { firstName, lastName } = manager || {};
          return {
            ...record,
            manager: manager ? `${firstName} ${lastName}` : '',
          };
        }),
      );
  }
  function fetchDepartments() {
    return prisma.department
      .findMany({
        select: {
          id: true,
          name: true,
          manager: {
            select: {
              employeeFields: { select: { firstName: true, lastName: true } },
            },
          },
          status: true,
        },
      })
      .then((records) =>
        records.map(({ manager, ...record }) => {
          const { firstName, lastName } = manager.employeeFields;
          return {
            ...record,
            manager: `${firstName} ${lastName}`,
          };
        }),
      );
  }
  function fetchManagers() {
    return prisma.manager
      .findMany({
        select: {
          id: true,
          employeeFields: { select: { firstName: true, lastName: true } },
        },
      })
      .then((records) =>
        records.map(({ employeeFields, ...record }) => {
          const { firstName, lastName } = employeeFields;
          return {
            ...record,
            name: `${firstName} ${lastName}`,
          };
        }),
      );
  }

  const [employees, departments, managers] = await Promise.all([
    fetchEmployees(),
    fetchDepartments(),
    fetchManagers(),
  ]);

  return json({ employees, departments, managers });
};

const Schema = z.object({
  employeeId: z.string(),
});
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { employeeId } = result.data;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { status: true },
    });
    if (!employee) {
      throw new Error('Employee record not found');
    }
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        status:
          employee.status === RecordStatus.Active
            ? RecordStatus.Inactive
            : RecordStatus.Active,
      },
    });
    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export const meta: MetaFunction = () => [{ title: 'Employees' }];

export default function EmployeesPage() {
  const loaderData = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof loader>();
  const { isProcessing: isLoading, getNameProp } = useForm(
    fetcher,
    LoaderSchema,
  );

  const departments = fetcher.data?.departments || loaderData.departments;
  const managers = fetcher.data?.managers || loaderData.managers;
  const employees = fetcher.data?.employees || loaderData.employees;

  const [flteredEmployees, setFilteredEmployees] = useState(employees);

  useEffect(() => {
    setFilteredEmployees(employees);
  }, [employees]);

  const statusOptions = [
    { label: 'Active Only', value: RecordStatus.Active },
    { label: 'All', value: undefined },
    { label: 'Inactive Only', value: RecordStatus.Inactive },
  ];

  function filter(searchTerm: string) {
    setFilteredEmployees(
      employees.filter((employee) => {
        const name = `${employee.firstName} ${employee.lastName}`;
        return (
          name.includes(searchTerm) ||
          employee.manager.includes(searchTerm) ||
          employee.status.includes(searchTerm)
        );
      }),
    );
  }

  return (
    <div className="h-screen flex flex-col items-stretch gap-2">
      <Toolbar />
      <div className="grow flex flex-row justify-start items-stretch px-6 py-2">
        <Menu />
        <div className="flex grow flex-col items-stretch gap-4 px-6 py-4">
          <span className="text-lg font-semibold">Employees</span>
          <div>
            <Fieldset title="Filters" className="flex flex-col items-center">
              <fetcher.Form
                method="get"
                className="flex flex-col items-stretch gap-2 min-w-[50%]"
              >
                <ActionContextProvider
                  {...fetcher.data}
                  isSubmitting={isLoading}
                >
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-stretch justify-center">
                      <span>Status</span>
                    </div>
                    <div className="col-span-2 flex flex-col items-stretch">
                      <FormSelect {...getNameProp('status')}>
                        <option key={'zxc'} value={''}>
                          -Select-
                        </option>
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </FormSelect>
                    </div>
                    <div className="flex flex-col items-stretch justify-center">
                      <span>Department</span>
                    </div>
                    <div className="col-span-2 flex flex-col items-stretch">
                      <FormSelect {...getNameProp('departmentId')}>
                        <option key={'zxc'} value={''}>
                          -Select-
                        </option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </FormSelect>
                    </div>
                    <div className="flex flex-col items-stretch justify-center">
                      <span>Manager</span>
                    </div>
                    <div className="col-span-2 flex flex-col items-stretch">
                      <FormSelect {...getNameProp('managerId')}>
                        <option key={'zxc'} value={''}>
                          -Select-
                        </option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </FormSelect>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <PrimaryButton type="submit">Filter</PrimaryButton>
                  </div>
                </ActionContextProvider>
              </fetcher.Form>
            </Fieldset>
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <div className="flex flex-row items-center gap-4">
              <div className="grow" />
              <DebouncedSearch runSearch={filter} placeholder="Search" />
            </div>
            <Card className="p-4">
              <table className="min-w-[75%]">
                <thead>
                  <tr>
                    {[
                      'Actions',
                      'First Name',
                      'Last Name',
                      'Phone',
                      'Email',
                      'Manager',
                      'Status',
                    ].map((field) => (
                      <td key={field}>
                        <span className="text-sm font-semibold">{field}</span>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flteredEmployees.map((employee) => {
                    return <TableRow key={employee.id} {...employee} />;
                  })}
                  {!flteredEmployees.length && (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-col justify-center items-center p-4">
                          <span className="text-xl font-light text-stone-400">
                            No employees found
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TableRowProps extends ComponentProps<'tr'> {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  manager: string;
  status: string;
}
function TableRow(props: TableRowProps) {
  const {
    id,
    firstName,
    lastName,
    phone,
    email,
    manager,
    status,
    ...restOfProps
  } = props;

  const fetcher = useFetcher<typeof action>();
  const { isProcessing, getNameProp } = useForm(fetcher, Schema);

  return (
    <tr
      key={new Date().toString()}
      {...restOfProps}
      className="text-sm font-light"
    >
      <td>
        <div className="flex flex-row items-center gap-4">
          <Link
            to={AppLinks.EditEmployee(id)}
            className="text-indigo-600 hover:text-indigo-600 hover:underline py-4"
          >
            Edit
          </Link>
          <fetcher.Form method="post" className="flex flex-col items-start">
            <ActionContextProvider
              {...fetcher.data}
              isSubmitting={isProcessing}
            >
              <input type="hidden" {...getNameProp('employeeId')} value={id} />
              <button
                type="submit"
                className={twMerge(
                  'text-blue-600 hover:text-blue-800 hover:underline',
                  status === RecordStatus.Active &&
                    'text-red-600 hover:text-red-800',
                )}
              >
                {status === RecordStatus.Active ? 'Deactivate' : 'Activate'}
              </button>
            </ActionContextProvider>
          </fetcher.Form>
        </div>
      </td>
      <td>{firstName}</td>
      <td>{lastName}</td>
      <td>{phone}</td>
      <td>{email}</td>
      <td>{manager}</td>
      <td>{status}</td>
    </tr>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
