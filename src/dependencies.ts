import Discord from 'discord.js';
import { config } from './config';
import * as eventWait from 'event-wait';
import { DiscordMessageQueueFactory } from './lib/discord-message-queue-factory';
import { MessageController } from './lib/message-controller';
import { MusicPlayerController } from './lib/controllers/music-player';

class Dependencies {
    public readonly discordBot = new Discord.Client();
    public readonly discordMessageQueueFactory = new DiscordMessageQueueFactory();
    public readonly messageControllers: MessageController[] = [
        new MusicPlayerController()
    ];

    async initialize(): Promise<void> {
        const readyFlag = eventWait.createWaitEventObject();
        await this.discordBot.login(config.secrets.DISCORD_BOT_TOKEN);
        this.discordBot.once('ready', readyFlag.set);
        await readyFlag.wait();
    }

}
const dependencies = new Dependencies();
export { dependencies };