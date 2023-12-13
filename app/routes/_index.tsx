import type { LoaderFunctionArgs } from '@remix-run/node';

import { redirect } from '@remix-run/node';

import { AppLinks } from '~/models/links';

export async function loader({ request }: LoaderFunctionArgs) {
  return redirect(AppLinks.Employees);
}
