import EntityDetail from "@/components/EntityDetail";

export default async function EntityDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <EntityDetail name={decodeURIComponent(name)} />;
}
