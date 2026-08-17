import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();
async function main(){await prisma.job.deleteMany({});console.log('No demo users or demo jobs are created. Create a real account through the application.');}
main().finally(()=>prisma.$disconnect());
