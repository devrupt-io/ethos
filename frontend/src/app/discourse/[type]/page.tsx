import DiscourseDetail from "@/components/DiscourseDetail";

export default async function DiscourseDetailPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  return <DiscourseDetail type={decodeURIComponent(type)} />;
}
