
const { Telegraf } = require('telegraf');

const token = '8439938808:AAHZ6eiP1gGA8JIbiPZZ-Nq6FahASn2vsqI';
const bot = new Telegraf(token);

console.log('🤖 Listening for messages to get Chat ID...');
console.log('👉 Please send a message (e.g., /start) to @Suchtoficial_bot now.');

bot.on('message', (ctx) => {
    const chat = ctx.chat;
    const from = ctx.from;
    console.log('\n✅ MESSAGE RECEIVED!');
    console.log('------------------------------------------------');
    console.log(`👤 From: ${from.first_name} (@${from.username})`);
    console.log(`🆔 CHAT ID: ${chat.id}`);
    console.log('------------------------------------------------');
    console.log(`📌 Add this line to your .env file:`);
    console.log(`TELEGRAM_CHAT_ID=${chat.id}`);
    console.log('------------------------------------------------');
    process.exit(0);
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
