type DiscordIconProps = {
  className?: string;
  size?: number;
};

export const DISCORD_INVITE_URL = "https://discord.gg/hj6Yy4Dcz";
export const DISCORD_ICON_SRC = "/assets/global/discord.png";

export function DiscordIcon({ className, size = 16 }: DiscordIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={DISCORD_ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}
