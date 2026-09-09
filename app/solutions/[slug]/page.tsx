import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { marketingFeatures } from "@/lib/marketing-content";

export function generateStaticParams() {
  return marketingFeatures.map(({ slug }) => ({ slug }));
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = marketingFeatures.find((item) => item.slug === slug);
  if (!feature) notFound();
  return <main className="solution-page">
    <header><Link href="/"><ArrowLeft size={18} />Caribbean POS Connect</Link><Link href="/signup">Get started<ArrowRight size={18} /></Link></header>
    <section className="solution-hero">
      <Image src={`/marketing/${feature.image}`} alt="" fill sizes="100vw" priority className="object-cover" />
      <div><p>{feature.name}</p><h1>{feature.title}</h1><p>{feature.description}</p><Link href={feature.route}>Open {feature.name}<ArrowRight size={18} /></Link></div>
    </section>
    <section className="solution-steps"><h2>How it works</h2><ol>{feature.steps.map((step) => <li key={step}>{step}</li>)}</ol><Link href="/signup">Create your business account<ArrowRight size={18} /></Link></section>
    <nav aria-label="Explore features" className="solution-related">{marketingFeatures.map((item) => <Link key={item.slug} href={`/solutions/${item.slug}`} aria-current={item.slug === slug ? "page" : undefined}>{item.name}</Link>)}</nav>
    <footer><Link href="/contact">Contact</Link><Link href="/privacy">Privacy policy</Link><Link href="/#plans">Plans</Link></footer>
  </main>;
}
