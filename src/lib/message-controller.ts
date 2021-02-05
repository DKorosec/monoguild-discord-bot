import { DiscordMessageEx } from "../discord-extensions/types";

export abstract class MessageController {

    public abstract handle(command: string, message: DiscordMessageEx): Promise<boolean> | boolean;
    public abstract help(): { kw: string, txt: string };

    public canHandle(message: DiscordMessageEx): Promise<boolean> | boolean {
        return message.content.startsWith(this.commandPrefix);
    }

    public get commandPrefix(): string {
        return `?!${this.help().kw}::`;
    }
}