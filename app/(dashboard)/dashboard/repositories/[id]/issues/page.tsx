import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs"
import { getRepositoryById } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import LoadingSpinner from "@/components/loading-spinner"
import { IssuesClient } from "./issues-client"

// This is a Server Component that fetches data
export default async function RepositoryIssuesPage({ params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const repository = await getRepositoryById(params.id);
  if (!repository) notFound();

  // Ensure we have access to this repository
  if (repository.userId !== userId) {
    redirect("/dashboard/repositories");
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">
        Security Issues for {repository.name}
      </h1>

      <Suspense fallback={<LoadingSpinner />}>
        <IssuesClient repository={repository} />
      </Suspense>
    </div>
  );
} 