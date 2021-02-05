import { DiscordMessageEx } from "../../discord-extensions/types";
import { MessageController } from "../message-controller";
import { getGuildMember } from "../utils/guild";



type StripAllRolesCommand = `strip-all-roles ${string}`;
type Commands = StripAllRolesCommand;

export class AdminControlPanelController extends MessageController {

    public help(): { kw: string, txt: string } {
        const kw = 'admin';
        return {
            kw, txt: `\`\`\`:: ADMIN-CONTROL-PANEL ::
*** only admins can use those commands ***

?!${kw}::strip-all-roles USER_ID >>> removes all roles from user, so he can only visit <@everyone> category.\`\`\``
        };
    }

    async canHandle(message: DiscordMessageEx): Promise<boolean> {
        if (!await super.canHandle(message)) {
            return false;
        }

        const isAdmin = getGuildMember(message.author.id)!.roles.cache.some(role => role.name === 'ADMIN');
        if (!isAdmin) {
            await message.delete();
            return false;
        }
        return true;
    }

    async handleStripAllRolesCommand(command: StripAllRolesCommand, message: DiscordMessageEx): Promise<void> {
        const [, ...rest] = command.split(' ');
        const userId = rest.join(' ');
        const member = getGuildMember(userId);
        if (!member) {
            await message.inlineReply(`User with id "${userId}" does not exist.`);
            return;
        }
        await member.roles.remove(member.roles.cache);
        await message.inlineReply(`Stripped all roles from <@${userId}>.`);
    }

    async handle(command: Commands, message: DiscordMessageEx): Promise<boolean> {
        if (command.startsWith('strip-all-roles ')) {
            await this.handleStripAllRolesCommand(command as StripAllRolesCommand, message);
            return true;
        }
        return false;
    }
}