import { PublicUserProfilePage } from "@/components/profile/PublicUserProfilePage";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return { title: `${decoded} — Profil public — Zaap Builder` };
}

export default async function UserProfileRoute({ params }: PageProps) {
  const { username } = await params;
  return <PublicUserProfilePage username={decodeURIComponent(username)} />;
}
