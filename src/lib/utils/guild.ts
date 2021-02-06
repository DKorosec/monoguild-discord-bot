import { dependencies } from "../../dependencies";
import { config } from '../../config';
import { Guild, GuildChannel, GuildMember, VoiceChannel } from "discord.js";

export function getGuild(): Guild {
    return dependencies.discordBot.guilds.cache.get(config.discordGuild.id)!;
}

export function getGuildMember(memberId: string): GuildMember | undefined {
    return getGuild().members.cache.get(memberId);
}

export function getGuildMemberVoiceChannel(memeberId: string): VoiceChannel | null {
    const member = getGuildMember(memeberId)!;
    if (member.voice.channel?.guild.id !== config.discordGuild.id) {
        return null;
    }
    return member.voice.channel;
}

export function getGuildChannel(channelId: string): GuildChannel | undefined {
    return getGuild().channels.cache.get(channelId);
}