import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Clock } from "lucide-react";

export default async function Home() {
  const worksheets = await prisma.worksheet.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Worksheets</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your worksheets
            </p>
          </div>
          <Link href="/editor">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Worksheet
            </Button>
          </Link>
        </div>

        {/* Worksheet list */}
        {worksheets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                No worksheets yet
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                Create your first worksheet to get started
              </p>
              <Link href="/editor">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Worksheet
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {worksheets.map((ws) => (
              <Link key={ws.id} href={`/editor/${ws.id}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-1">
                        {ws.title}
                      </CardTitle>
                      {ws.published && (
                        <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                          Published
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {new Date(ws.updatedAt).toLocaleDateString("de-CH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {Array.isArray(ws.blocks)
                        ? `${(ws.blocks as unknown[]).length} blocks`
                        : "Empty"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
