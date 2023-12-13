import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

import { RecordStatus } from '~/models/core.validations';

const prisma = new PrismaClient();

let hashedPassword = '';

function createUser() {
  return {
    username: faker.internet.userName(),
    password: hashedPassword,
  } as const;
}

function createEmployee() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.imei(),
    email: faker.internet.email(),
    status: RecordStatus.Active,
    user: {
      create: createUser(),
    },
  };
}

function createEmployees(numRecords: number) {
  return [...Array(numRecords).keys()].map((_) => ({
    employee: {
      create: createEmployee(),
    },
  }));
}

function createDepartments(numRecords: number) {
  return [...Array(numRecords).keys()].map((_) => ({
    name: faker.company.buzzNoun(),
    status: RecordStatus.Active,
  }));
}

async function seed() {
  await prisma.department.deleteMany();
  await prisma.employeeManager.deleteMany();
  await prisma.manager.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  hashedPassword = await hash('TestPass1234', 10);

  await prisma.user.create({
    data: {
      username: 'hradmin@test.com',
      password: hashedPassword,
    },
  });

  for (let i = 0; i < 5; i++) {
    await prisma.manager.create({
      data: {
        employeeFields: {
          create: createEmployee(),
        },
        departments: {
          create: createDepartments(5),
        },
        employees: {
          create: createEmployees(5),
        },
      },
    });
  }
  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
