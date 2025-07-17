// This file extends the Prisma Client types with custom models
import { PrismaClient } from "@prisma/client";

declare module "@prisma/client" {
  interface PrismaClient {
    roomInventory: {
      count: any;
      createMany: any;
      findMany: any;
      deleteMany: any;
    };
  }
}
