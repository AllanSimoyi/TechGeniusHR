import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from '@remix-run/node';

import { json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';

import {
  ActionContextProvider,
  useForm,
} from '~/components/ActionContextProvider';
import Fieldset from '~/components/Fieldset';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { checkIfValidLogin } from '~/models/user.server';
import { createUserSession } from '~/session.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // const userId = await getUserId(request);
  // if (userId) {
  //   return redirect(AppLinks.Home);
  // }
  return json({});
};

const Schema = z.object({
  username: z.string().min(1),
  password: z.string(),
});
export const action = async ({ request }: ActionFunctionArgs) => {
  const fields = await getRawFormFields(request);
  const result = Schema.safeParse(fields);
  if (!result.success) {
    return processBadRequest(result.error, fields);
  }
  const { username, password } = result.data;

  const verResult = await checkIfValidLogin(username, password);
  if (verResult instanceof Error) {
    return badRequest({ formError: verResult.message });
  }
  const user = verResult;

  return createUserSession({
    redirectTo: AppLinks.Employees,
    remember: true,
    request,
    userId: user.id,
  });
};

export const meta: MetaFunction = () => [{ title: 'Login' }];

export default function LoginPage() {
  const fetcher = useFetcher<typeof action>();
  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  return (
    <div className="h-full flex flex-col justify-center items-center p-6">
      <Fieldset title="Login">
        {/* <legend>Login</legend> */}
        <fetcher.Form
          method="post"
          className="flex flex-col items-stretch gap-6"
        >
          <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
            <div className="flex flex-col justify-center items-center">
              <h1 className="text-2xl font-semibold">Login</h1>
            </div>
            <FormTextField
              {...getNameProp('username')}
              label="Username"
              required
            />
            <FormTextField
              {...getNameProp('password')}
              type="password"
              label="Passsword"
              required
            />
            {hasFormError(fetcher.data) ? (
              <InlineAlert>{fetcher.data.formError}</InlineAlert>
            ) : null}
            <div className="flex flex-col items-stretch py-2 gap-6">
              <PrimaryButton type="submit">
                {isProcessing ? 'Logging In...' : 'Log In'}
              </PrimaryButton>
            </div>
          </ActionContextProvider>
        </fetcher.Form>
      </Fieldset>
    </div>
  );
}
