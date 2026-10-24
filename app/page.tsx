import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  CalendarDays,
  BarChart3,
  ArrowRight,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { londonFontFamily, qualyFontFamily } from "@/lib/fonts";

const links = [
  {
    href: "/dashboards",
    label: "Dashboards",
    description: "Quicky create tasks & track today's progress at a glance.",
    icon: LayoutDashboard,
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Browse and manage your projects, group multiple tasks.",
    icon: FolderKanban,
  },
  {
    href: "/tasks",
    label: "Tasks",
    description: "Track & manage your tasks.",
    icon: ListChecks,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Manage all records straight on a Calendar view.",
    icon: CalendarDays,
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Metrics and insights over time.",
    icon: BarChart3,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-6 py-16 sm:px-10">
        <div className="space-y-2">
          <h1 className={`text-4xl font-semibold tracking-tight sm:text-5xl ${londonFontFamily.className}`}>
            Go to
          </h1>
          <p className={`text-lg text-muted-foreground ${londonFontFamily.className}`}>
            Jump to any section of the app.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full min-h-48 justify-between transition-all hover:-translate-y-1 hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardHeader className="gap-4">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-7" />
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className={`flex items-center justify-between text-2xl ${qualyFontFamily.className}`}>
                      {label}
                      <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </CardTitle>
                    <CardDescription className={`text-base ${londonFontFamily.className}`}>
                      {description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}