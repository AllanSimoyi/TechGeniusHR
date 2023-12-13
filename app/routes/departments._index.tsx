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
});
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireUserId(request);

  const queryParams = getQueryParams<keyof z.infer<typeof LoaderSchema>>(
    request.url,
    ['status'],
  );

  const result = LoaderSchema.safeParse(queryParams);
  if (!result.success) {
    throw new Response('Invalid input provided, please try again', {
      status: StatusCode.BadRequest,
    });
  }
  const { status } = result.data;

  function fetchDepartments() {
    return prisma.department
      .findMany({
        where: { status },
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

  const departments = await fetchDepartments();

  return json({ departments });
};

const Schema = z.object({
  departmentId: z.string(),
});
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { departmentId } = result.data;

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { status: true },
    });
    if (!department) {
      throw new Error('Department record not found');
    }
    await prisma.department.update({
      where: { id: departmentId },
      data: {
        status:
          department.status === RecordStatus.Active
            ? RecordStatus.Inactive
            : RecordStatus.Active,
      },
    });
    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export const meta: MetaFunction = () => [{ title: 'Departments' }];

export default function EmployeesPage() {
  const loaderData = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof loader>();
  const { isProcessing: isLoading, getNameProp } = useForm(
    fetcher,
    LoaderSchema,
  );

  const departments = fetcher.data?.departments || loaderData.departments;

  const [filteredDepartments, setFilteredDepartments] = useState(departments);

  useEffect(() => {
    setFilteredDepartments(departments);
  }, [departments]);

  const statusOptions = [
    { label: 'Active Only', value: RecordStatus.Active },
    { label: 'All', value: undefined },
    { label: 'Inactive Only', value: RecordStatus.Inactive },
  ];

  function filter(searchTerm: string) {
    const refinedSearchTerm = searchTerm.toLowerCase();
    setFilteredDepartments(
      departments.filter((department) => {
        return (
          department.name.toLowerCase().includes(refinedSearchTerm) ||
          department.manager.toLowerCase().includes(refinedSearchTerm) ||
          department.status.toLowerCase().includes(refinedSearchTerm)
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
          <span className="text-lg font-semibold">Departments</span>
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
                    {['Actions', 'Name', 'Manager', 'Status'].map((field) => (
                      <td key={field}>
                        <span className="text-sm font-semibold">{field}</span>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((employee) => {
                    return <TableRow key={employee.id} {...employee} />;
                  })}
                  {!filteredDepartments.length && (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-col justify-center items-center p-4">
                          <span className="text-xl font-light text-stone-400">
                            No departments found
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
  name: string;
  manager: string;
  status: string;
}
function TableRow(props: TableRowProps) {
  const { id, name, manager, status, ...restOfProps } = props;

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
            to={AppLinks.EditDepartments(id)}
            className="text-indigo-600 hover:text-indigo-600 hover:underline py-4"
          >
            Edit
          </Link>
          <fetcher.Form method="post" className="flex flex-col items-start">
            <ActionContextProvider
              {...fetcher.data}
              isSubmitting={isProcessing}
            >
              <input
                type="hidden"
                {...getNameProp('departmentId')}
                value={id}
              />
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
      <td>{name}</td>
      <td>{manager}</td>
      <td>{status}</td>
    </tr>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
