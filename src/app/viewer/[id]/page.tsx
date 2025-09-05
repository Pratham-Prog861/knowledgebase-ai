import ViewerClient from "./viewer-client";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ViewerPage({ params, searchParams }: Props) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/');
  }
  
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  
  // Get document data from searchParams (passed from dashboard)
  const title = sp.title as string;
  const source = sp.source as string;
  const type = (sp.type as string) as "file" | "web";
  
  // If we don't have the required data from searchParams, show 404
  if (!title || !source || !type) {
    return notFound();
  }
  
  const doc = { id, title, source, type };

  return (
    <div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{doc.title}</h1>
          <a
            href={doc.type === "web" ? doc.source : "#"}
            target="_blank"
            className="text-sm underline underline-offset-4"
          >
            {doc.type === "web" ? "Open Source" : "Download"}
          </a>
        </div>
        <ViewerClient docId={doc.id} title={doc.title} />
      </div>
    </div>
  );
}
