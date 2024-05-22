const { Telegraf } = require('telegraf');

require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// ! Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

module.exports = bot;
