
const { TZDate } = require('@date-fns/tz');
process.env.TZ = 'UTC';

const timeZone = 'America/Argentina/Buenos_Aires';
const isoString = '2025-12-10T04:30:00.000Z'; // 01:30 BA time

console.log('--- Environment: UTC ---');
console.log('Input ISO:', isoString);

const d1 = new Date(isoString);
console.log('\nStandard Date:');
console.log('toString:', d1.toString());
console.log('toISOString:', d1.toISOString());

const d2 = new TZDate(isoString, timeZone);
console.log('\nTZDate:');
console.log('toString:', d2.toString());
console.log('toISOString:', d2.toISOString());

console.log('\nSame instant?', d1.getTime() === d2.getTime());
