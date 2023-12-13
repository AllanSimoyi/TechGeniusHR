export const AppLinks = {
  Home: '/',
  Login: '/login',

  Employees: '/employees',
  CreateEmployee: '/employees/create',
  EditEmployee: (id: string) => `/employees/${id}/edit`,
  Departments: '/departments',
  CreateDepartment: '/departments/create',
  EditDepartments: (id: string) => `/departments/${id}/edit`,
};
