import type { Metadata } from "next";

import { SharedBuildClient } from "./SharedBuildClient";
import {
  buildOgDescription,
  buildOgTitle,
  fetchBuildForOg,
  getSiteUrl,
  isValidBuildId,
} from "@/lib/buildOg";

type PageProps = {
  params: Promise<{ buildId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { buildId } = await params;

  if (!isValidBuildId(buildId)) {
    return {
      title: "Build introuvable — Zaap Builder",
      description: "Ce lien de build est invalide.",
    };
  }

  const build = await fetchBuildForOg(buildId);
  if (!build) {
    return {
      title: "Build introuvable — Zaap Builder",
      description: "Ce build n’existe pas ou n’est plus public.",
    };
  }

  const title = buildOgTitle(build);
  const description = buildOgDescription(build);
  const url = `${getSiteUrl()}/build/${buildId}`;

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Zaap Builder",
      type: "website",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedBuildPage({ params }: PageProps) {
  const { buildId } = await params;
  return <SharedBuildClient buildId={buildId} />;
}
