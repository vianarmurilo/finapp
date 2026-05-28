"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const gamificationScheduler_1 = require("./bootstrap/gamificationScheduler");
(0, gamificationScheduler_1.scheduleGamificationJobs)();
app_1.app.listen(env_1.env.PORT, () => {
    console.log(`FinMind AI+ API rodando na porta ${env_1.env.PORT}`);
});
