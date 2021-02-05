import { GuildMember, TextChannel, VoiceChannel } from "discord.js";

export function canMemberViewChannel(member: GuildMember, channel: TextChannel | VoiceChannel): boolean {
    return channel.permissionsFor(member)?.has('VIEW_CHANNEL') ?? false;
}