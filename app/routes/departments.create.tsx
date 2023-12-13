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
import { RecordStatus, processBadRequest } from '~/models/core.validations';
import { getRawFormFields } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireUserId(request);

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
  return json({ managers });
};

const Schema = z.object({
  name: z.string().min(3),
  managerId: z.string().min(1),
});
export const action = async ({ request }: ActionFunctionArgs) => {
  const fields = await getRawFormFields(request);
  const result = Schema.safeParse(fields);
  if (!result.success) {
    return processBadRequest(result.error, fields);
  }
  const { name, managerId } = result.data;

  await prisma.department.create({
    data: {
      name,
      managerId,
      status: RecordStatus.Active,
    },
  });

  return redirect(AppLinks.Departments);
};

export const meta: MetaFunction = () => [{ title: 'Departments' }];

export default function Page() {
  const { managers } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

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
                isSubmitting={isProcessing}
              >
                <span className="text-lg font-semibold">Create Employee</span>
                <div className="grid grid-cols-5 gap-6">
                  <div className="flex flex-col justify-center">
                    <span>Name</span>
                  </div>
                  <div className="col-span-4 flex flex-col items-stretch">
                    <FormTextField {...getNameProp('name')} />
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
                </div>
                <div className="flex flex-row items-center gap-4">
                  <div className="grow" />
                  <PrimaryButton type="submit" disabled={isProcessing}>
                    {isProcessing ? 'Saving...' : 'Save'}
                  </PrimaryButton>
                  <SecondaryButtonLink to={AppLinks.Departments}>
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
