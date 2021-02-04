import 'source-map-support/register';
import { dependencies } from './dependencies';
import Discord from 'discord.js';
import MessageExtension from './discord-extensions/message';
import { DiscordMessageEx } from './discord-extensions/types';
import { isMessageProcessable } from './lib/utils/message-filter';
Discord.Structures.extend('Message', () => MessageExtension);

async function processMessageQueue(): Promise<void> {
    while (true) {
        const message = await dependencies.discordMessageQueueFactory.consume();
        // find all that can handle the message request.
        const canHandleMap = await Promise.all(dependencies.messageControllers
            .map(controller => ({ controller, canHandle: controller.canHandle(message) })));
        // filter out those who cant.
        const canHandle = canHandleMap.filter(({ canHandle }) => canHandle);
        // the ones who can, should start to process the message.
        await Promise.all(canHandle.map(({ controller }) => controller.handle(message)));
    }
}


async function main(): Promise<void> {
    console.log('::Initializing discord bot ...'); // eslint-disable-line no-console
    await dependencies.initialize();
    dependencies.discordBot.on('message', ((message: DiscordMessageEx): void => {
        if (!isMessageProcessable(message)) {
            return;
        }
        dependencies.discordMessageQueueFactory.produce(message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
    console.log('... Discord bot up and running::'); // eslint-disable-line no-console
    await processMessageQueue();
}
main();