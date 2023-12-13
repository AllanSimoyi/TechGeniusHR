import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from '@remix-run/node';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import {
  ActionContextProvider,
  useForm,
} from '~/components/ActionContextProvider';
import { Card } from '~/components/Card';
import { FormSelect } from '~/components/FormSelect';
import { FormTextField } from '~/components/FormTextField';
import Menu from '~/components/Menu';
import { PrimaryButton } from '~/components/PrimaryButton';
import { SecondaryButtonLink } from '~/components/SecondaryButton';
import { Toolbar } from '~/components/Toolbar';
import { prisma } from '~/db.server';
import {
  RecordStatus,
  StatusCode,
  badRequest,
  getValidatedId,
  processBadRequest,
} from '~/models/core.validations';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireUserId(request);

  const id = getValidatedId(params.id);
  const employee = await prisma.employee
    .findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        managers: {
          select: {
            managerId: true,
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
    .then((record) => {
      if (!record) {
        return undefined;
      }
      const manager = record.managers.length
        ? record.managers[0].manager.employeeFields
        : undefined;
      const managerId = record.managers.length
        ? record.managers[0].managerId
        : undefined;
      const { firstName, lastName } = manager || {};
      return {
        ...record,
        managerId,
        manager: manager ? `${firstName} ${lastName}` : '',
      };
    });
  if (!employee) {
    throw new Response('Employee record not found', {
      status: StatusCode.NotFound,
    });
  }

  const managers = await prisma.manager
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
  return json({ employee, managers });
};

const Schema = z.object({
  firstName: z.string().min(3),
  lastName: z.string().min(3),
  phone: z.string().min(6),
  email: z.string().email(),
  managerId: z.string().min(1),
  status: z.string().min(1),
});
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const id = getValidatedId(params.id);

  const fields = await getRawFormFields(request);
  const result = Schema.safeParse(fields);
  if (!result.success) {
    return processBadRequest(result.error, fields);
  }
  const { firstName, lastName, phone, email, managerId, status } = result.data;

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { managers: { select: { managerId: true } } },
  });
  if (!employee) {
    return badRequest({ formError: 'No employee record found' });
  }
  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone,
        email,
        status,
      },
    });
    await tx.employeeManager.updateMany({
      where: {
        managerId: {
          in: employee.managers.map((manager) => manager.managerId),
        },
        employeeId: id,
      },
      data: { managerId },
    });
  });

  return redirect(AppLinks.Employees);
};

export const meta: MetaFunction = () => [{ title: 'Employees' }];

export default function Page() {
  const { managers, employee } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const defaultValues: Record<keyof z.infer<typeof Schema>, string> = {
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone,
    email: employee.email,
    managerId: employee.managerId?.toString() || '',
    status: employee.status,
  };

  const statusOptions = [
    { label: 'Active Only', value: RecordStatus.Active },
    { label: 'All', value: undefined },
    { label: 'Inactive Only', value: RecordStatus.Inactive },
  ];

  return (
    <div className="h-screen flex flex-col items-stretch gap-2">
      <Toolbar />
      <div className="grow flex flex-row justify-start items-stretch px-6 py-2 gap-4">
        <Menu />
        <div className="flex flex-col items-stretch grow">
          <Card className="p-4">
            <fetcher.Form
              method="post"
              className="flex flex-col items-stretch gap-8 min-w-[50%]"
            >
              <ActionContextProvider
                {...fetcher.data}
                fields={fetcher.data || defaultValues}
                isSubmitting={isProcessing}
              >
                <span className="text-lg font-semibold">Edit Employee</span>
                <div className="grid grid-cols-5 gap-6">
                  <div className="flex flex-col justify-center">
                    <span>Name</span>
                  </div>
                  <div className="col-span-4 flex flex-col items-stretch">
                    <FormTextField {...getNameProp('firstName')} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span>Surname</span>
                  </div>
                  <div className="col-span-4 flex flex-col items-stretch">
                    <FormTextField {...getNameProp('lastName')} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span>Phone</span>
                  </div>
                  <div className="col-span-4 flex flex-col items-stretch">
                    <FormTextField {...getNameProp('phone')} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span>Email</span>
                  </div>
                  <div className="col-span-4 flex flex-col items-stretch">
                    <FormTextField {...getNameProp('email')} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span>Manager</span>
                  </div>
                  <div className="col-span-4 flex flex-col items-stretch">
                    <FormSelect {...getNameProp('managerId')}>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span>Status</span>
                  </div>
                  <div className="col-span-4 flex flex-col items-stretch">
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
                <div className="flex flex-row items-center gap-4">
                  <div className="grow" />
                  <PrimaryButton type="submit" disabled={isProcessing}>
                    {isProcessing ? 'Saving...' : 'Save'}
                  </PrimaryButton>
                  <SecondaryButtonLink to={AppLinks.Employees}>
                    Cancel
                  </SecondaryButtonLink>
                </div>
              </ActionContextProvider>
            </fetcher.Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
