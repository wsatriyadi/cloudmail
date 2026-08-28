"use client";

import React from "react";
import Link from "next/link";
import { Mail, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  apiEndpoints,
  authGuide,
  quickStart,
  errorCodes,
  type ApiEndpoint,
} from "@/lib/api-docs";

function MethodBadge({ method }: { method: string }) {
  const variant =
    method === "POST"
      ? "default"
      : method === "DELETE"
      ? "destructive"
      : method === "GET"
      ? "success"
      : "secondary";
  return (
    <Badge variant={variant} className="font-mono">
      {method}
    </Badge>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs"
      onClick={handleCopy}
      aria-label={label || "Salin ke clipboard"}
    >
      {copied ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
      {copied ? "Tersalin" : "Salin"}
    </Button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-md border bg-muted/30 p-4 text-sm font-mono leading-relaxed">
        <code className="break-anywhere">{children.trim()}</code>
      </pre>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton text={children.trim()} />
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const curlExample = buildCurlExample(endpoint);

  return (
    <Card id={endpoint.path.replace(/[{}]/g, "").replace(/\//g, "-").slice(1)}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={endpoint.method} />
          <code className="break-anywhere text-sm font-semibold">{endpoint.path}</code>
        </div>
        <CardTitle className="text-lg">{endpoint.title}</CardTitle>
        <CardDescription>{endpoint.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-semibold">Autentikasi</h4>
          <p className="text-sm text-muted-foreground">{endpoint.auth}</p>
          {endpoint.permissions && endpoint.permissions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {endpoint.permissions.map((p) => (
                <Badge key={p} variant="outline" className="font-mono text-xs">
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {endpoint.request && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Request</h4>
            <CodeBlock>{curlExample}</CodeBlock>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-semibold">Response</h4>
          <Tabs defaultValue="success">
            <TabsList>
              <TabsTrigger value="success">Success</TabsTrigger>
              {endpoint.response.error && <TabsTrigger value="error">Error</TabsTrigger>}
            </TabsList>
            <TabsContent value="success" className="mt-3">
              <CodeBlock>{endpoint.response.success}</CodeBlock>
            </TabsContent>
            {endpoint.response.error && (
              <TabsContent value="error" className="mt-3">
                <CodeBlock>{endpoint.response.error}</CodeBlock>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

function buildCurlExample(endpoint: ApiEndpoint): string {
  const lines: string[] = [];
  const path = endpoint.path.replace("{email}", "user@yourdomain.com").replace("{id}", "abc123");
  let url = `https://yourdomain.com${path}`;

  if (endpoint.request?.query) {
    const params = new URLSearchParams(endpoint.request.query).toString();
    url += `?${params}`;
  }

  lines.push(`curl -X ${endpoint.method} ${url} \\`);

  if (endpoint.request?.headers) {
    for (const [key, value] of Object.entries(endpoint.request.headers)) {
      lines.push(`  -H "${key}: ${value}" \\`);
    }
  }

  if (endpoint.request?.body) {
    lines.push(`  -d '${endpoint.request.body}'`);
  } else {
    lines[lines.length - 1] = lines[lines.length - 1].replace(" \\", "");
  }

  return lines.join("\n");
}

function MarkdownSection({ children }: { children: string }) {
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:text-base prose-h2:tracking-tight prose-h3:text-sm prose-h3:tracking-tight prose-p:text-sm prose-p:leading-relaxed prose-pre:bg-muted/30 prose-pre:text-sm prose-code:break-anywhere prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-table:text-sm"
      dangerouslySetInnerHTML={{ __html: simpleMarkdown(children) }}
    />
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .replace(/(<tr>[\s\S]*?<\/tr>)/g, "<table>$1</table>")
    .replace(/^(?!<[h]|<table|<code|<pre)(.+)$/gm, "<p>$1</p>")
    .replace(/```(\w+)?\n([\s\S]+?)\n```/g, "<pre><code>$2</code></pre>")
    .replace(/\n\n/g, "\n");
}

export function DocsContent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Mail className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
            </span>
            CloudMail
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:gap-8 lg:px-8">
        {/* Sidebar navigation */}
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-6rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto">
          <nav aria-label="Navigasi dokumentasi" className="space-y-1">
            <a
              href="#quick-start"
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Quick Start
            </a>
            <a
              href="#authentication"
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Authentication
            </a>
            <div className="pb-2 pt-4">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Endpoints
              </p>
            </div>
            {apiEndpoints.map((ep) => (
              <a
                key={ep.path}
                href={`#${ep.path.replace(/[{}]/g, "").replace(/\//g, "-").slice(1)}`}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="font-mono text-xs">{ep.method}</span> {ep.title}
              </a>
            ))}
            <a
              href="#errors"
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Error Handling
            </a>
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-8 lg:max-w-3xl">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dokumentasi API</h1>
            <p className="mt-2 text-muted-foreground">
              CloudMail menyediakan REST API untuk generate identitas palsu dan kelola inbox
              otomatis. Gunakan untuk testing, otomasi e2e, dan scraping yang memerlukan verifikasi
              email.
            </p>
          </div>

          <section id="quick-start">
            <MarkdownSection>{quickStart}</MarkdownSection>
          </section>

          <section id="authentication">
            <MarkdownSection>{authGuide}</MarkdownSection>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">Endpoints</h2>
            {apiEndpoints.map((ep) => (
              <EndpointCard key={ep.path} endpoint={ep} />
            ))}
          </section>

          <section id="errors">
            <MarkdownSection>{errorCodes}</MarkdownSection>
          </section>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Butuh bantuan?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Jika API tidak bekerja seperti yang didokumentasikan, periksa log di dashboard atau
                hubungi admin instance Anda.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  Buka Dashboard
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
