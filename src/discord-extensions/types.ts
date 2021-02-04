import Discord from 'discord.js';
import MessageExtension from './message';

export type DiscordMessageEx = Discord.Message & MessageExtension;