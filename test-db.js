const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.clinicSetting.findFirst().then(r => {
  console.log(JSON.stringify(r));
  return p.workSchedule.findMany();
}).then(s => {
  console.log('Schedules:', s.length);
  return p.$disconnect();
}).catch(e => {
  console.error(e.message);
  p.$disconnect();
});
