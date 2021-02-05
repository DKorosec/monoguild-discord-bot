import { DiscordMessageEx } from "../discord-extensions/types";

export abstract class MessageController {
    public abstract canHandle(message: DiscordMessageEx): Promise<boolean> | boolean;
    public abstract handle(message: DiscordMessageEx): Promise<void> | void;
    public abstract help(): { kw: string, txt: string };
}