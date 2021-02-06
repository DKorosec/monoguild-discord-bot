import 'source-map-support/register';
import { dependencies } from './dependencies';
import Discord from 'discord.js';
import MessageExtension from './discord-extensions/message';
import { DiscordMessageEx } from './discord-extensions/types';
import { isMessageProcessable } from './lib/utils/message-filter';
import { MessageController } from './lib/message-controller';
import { getGuildChannel } from './lib/utils/guild';
Discord.Structures.extend('Message', () => MessageExtension);


async function handleHelp(message: DiscordMessageEx): Promise<boolean> {
    function cnt2help(cnt: MessageController): string {
        const { kw, txt } = cnt.help();
        return `> ?!help ${kw}\n${txt}`;
    }

    if (message.content === '?!help') {
        // list all help options
        const helpMsg = dependencies.messageControllers.filter(cnt => cnt.help().kw).map(cnt => {
            return cnt2help(cnt);
        }).join('\n');

        await message.inlineReply(helpMsg + '' +
            '```powershell\nGot some cool ideas and want to extend the current bot? Pull request your idea at:\n' +
            '"https://github.com/DKorosec/monoguild-discord-bot"```');
        return true;

    } else if (message.content.startsWith('?!help ')) {
        // list specific help option (if found)
        const [, ...rest] = message.content.split(' ');
        const helpKW = rest.join(' ');
        const cnt = dependencies.messageControllers.filter(cnt => cnt.help().kw).find(cnt => cnt.help().kw === helpKW);
        if (!cnt) {
            return false;
        }

        const helpMsg = cnt2help(cnt);
        await message.inlineReply(helpMsg);
        return true;

    }

    return false;
}

async function processMessageQueue(): Promise<void> {
    while (true) {
        const message = await dependencies.discordMessageQueueFactory.consume();
        if (!message.content.startsWith('?!')) {
            continue;
        }


        const isGeneralTextCh = getGuildChannel(message.channel.id)!.name.toLowerCase() === 'general';
        if (isGeneralTextCh) {
            await message.inlineReply('Bot commands are disabled in general text channels. Please, keep general clean.');
            continue;
        }


        if (await handleHelp(message)) {
            continue;
        }
        // find the one that can handle the message request.
        const canHandleMap = await Promise.all(dependencies.messageControllers
            .map(async controller => {
                return await controller.canHandle(message) ? controller : null;
            }));
        // filter out those who cant.
        const controller = canHandleMap.find(<T>(controller: T): controller is NonNullable<T> => controller !== null);
        if (!controller) {
            await message.inlineReply('Command not understood, please use `?!help` for list of commands.');
            continue;
        }
        // the ones who can, should start to process the message.
        const handledResult = await controller.handle(message.content.substring(controller.commandPrefix.length), message);
        if (!handledResult) {
            await message.inlineReply(`Invalid command. see \`?!help ${controller.help().kw}\` for usable commands.`);
            continue;
        }
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