import { config } from '../../config';
import { DiscordMessageEx } from '../../discord-extensions/types';

export function isHumanMessage(message: DiscordMessageEx): boolean {
    return !message.author.bot;
}

export function isMessageFromGuild(message: DiscordMessageEx, guildId: string): boolean {
    return message.guild?.id === guildId;
}

export function isMessageProcessable(message: DiscordMessageEx): boolean {
    return isHumanMessage(message) && isMessageFromGuild(message, config.discordGuild.id);
}