const PORTRAIT_BG = "/assets/global/UI/portraitBackground.png";

const SIZE = {
  xs: { box: "h-5 w-5", text: "text-[10px]", px: 20 },
  sm: { box: "h-8 w-8", text: "text-sm", px: 32 },
  lg: { box: "h-20 w-20", text: "text-3xl", px: 80 },
} as const;

type UserAvatarProps = {
  username: string;
  size?: keyof typeof SIZE;
  className?: string;
};

/** Avatar profil : fond portraitBackground + initiale du pseudo. */
export function UserAvatar({ username, size = "sm", className = "" }: UserAvatarProps) {
  const s = SIZE[size];
  const initial = username[0]?.toUpperCase() ?? "?";

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${s.box} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PORTRAIT_BG}
        alt=""
        width={s.px}
        height={s.px}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <span className={`relative font-bold uppercase text-[var(--dofus-green-active)] ${s.text}`}>
        {initial}
      </span>
    </span>
  );
}
