import { HomeContent } from "@/components/HomeContent";
import { generateLocaleStaticParams } from "@/i18n/generateLocaleStaticParams";

export function generateStaticParams() {
  return generateLocaleStaticParams();
}

export default function HomePage() {
  return <HomeContent />;
}
