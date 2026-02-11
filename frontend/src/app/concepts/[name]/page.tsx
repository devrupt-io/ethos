import ConceptDetail from "@/components/ConceptDetail";

export default function ConceptDetailPage({ params }: { params: { name: string } }) {
  return <ConceptDetail name={decodeURIComponent(params.name)} />;
}
