import { Icon, type IconName } from "@/lib/icons";

export function FeatureCard({
  icon,
  title,
  children,
  accent = "purple",
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
  accent?: "purple" | "brand" | "cyan";
}) {
  const tone =
    accent === "brand"
      ? "text-brand"
      : accent === "cyan"
        ? "text-cyan"
        : "text-purple";

  return (
    <div className="card p-6.5">
      <span className={`mb-4 block ${tone}`}>
        <Icon name={icon} size={24} />
      </span>
      <h3 className="mb-2.5 font-sans text-[17.5px] font-semibold leading-snug tracking-normal">
        {title}
      </h3>
      <p className="m-0 text-muted">{children}</p>
    </div>
  );
}
