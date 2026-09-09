import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { marketingFeatures } from "@/lib/marketing-content";

export function LandingNavigation() {
  return <>
    <nav className="landing-desktop-navigation" aria-label="Landing navigation">
      {[{ name: "Solutions", items: marketingFeatures.slice(0, 8) }, { name: "Segments", items: marketingFeatures.slice(8) }].map((group) => <details key={group.name} className="landing-nav-menu" name="landing-menu">
        <summary>{group.name}<ChevronDown size={15} /></summary>
        <div className="landing-nav-popover">{group.items.map((feature) => <Link key={feature.slug} href={`/solutions/${feature.slug}`}><strong>{feature.name}</strong><span>{feature.title}</span></Link>)}</div>
      </details>)}
      <Link href="/#plans">Pricing</Link>
      <Link href="/contact">Help</Link>
    </nav>
    <details className="landing-mobile-navigation">
      <summary aria-label="Open website menu"><Menu size={22} /></summary>
      <nav aria-label="Mobile website navigation"><Link href="/#plans">Pricing</Link><Link href="/login">Sign in</Link>{marketingFeatures.map((feature) => <Link href={`/solutions/${feature.slug}`} key={feature.slug}>{feature.name}</Link>)}<Link href="/contact">Contact & help</Link></nav>
    </details>
  </>;
}
