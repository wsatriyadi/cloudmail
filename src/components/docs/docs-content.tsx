"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Copy, Check, ExternalLink, ChevronDown, ChevronUp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <Badge variant={variant} className="font-mono text-xs px-2 py-0.5">
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

function CodeBlock({ children, language = "json" }: { children: string; language?: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-sm font-mono leading-relaxed text-slate-50 dark:bg-slate-900">
        <code className="break-anywhere">{children.trim()}</code>
      </pre>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton text={children.trim()} />
      </div>
    </div>
  );
}

function SwaggerEndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTryingOut, setIsTryingOut] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [requestBody, setRequestBody] = useState(endpoint.request?.body || "");
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const curlExample = buildCurlExample(endpoint);

  const handleTryOut = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const path = endpoint.path.replace("{email}", "user@example.com").replace("{id}", "abc123");
      const url = `${window.location.origin}${path}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const options: RequestInit = {
        method: endpoint.method,
        headers,
      };

      if (endpoint.method !== "GET" && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(url, options);
      const data = await res.text();

      setResponse({
        status: res.status,
        body: data || "(empty response)",
      });
    } catch (error) {
      setResponse({
        status: 0,
        body: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const methodColorClass =
    endpoint.method === "POST"
      ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
      : endpoint.method === "DELETE"
      ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
      : endpoint.method === "GET"
      ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
      : "bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/20";

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`rounded-lg border transition-colors ${isOpen ? methodColorClass : "border-border hover:border-muted-foreground/30"}`}
    >
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between p-4 text-left transition-colors"
          id={endpoint.path.replace(/[{}]/g, "").replace(/\//g, "-").slice(1)}
        >
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <MethodBadge method={endpoint.method} />
            <code className="flex-1 break-all font-mono text-sm font-semibold text-foreground">
              {endpoint.path}
            </code>
            <span className="hidden text-sm text-muted-foreground sm:block">
              {endpoint.title}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t bg-card/50 p-4">
        <div className="space-y-6">
          {/* Description */}
          <div>
            <h4 className="mb-2 text-base font-semibold">{endpoint.title}</h4>
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          </div>

          {/* Auth & Permissions */}
          <div className="rounded-md border bg-muted/30 p-3">
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Autentikasi
            </h5>
            <p className="text-sm">{endpoint.auth}</p>
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

          {/* Try It Out */}
          <div className="space-y-4 rounded-md border-2 border-dashed border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">Try It Out</h5>
              <Button
                size="sm"
                onClick={() => setIsTryingOut(!isTryingOut)}
                variant={isTryingOut ? "default" : "outline"}
              >
                {isTryingOut ? "Cancel" : "Try It Out"}
              </Button>
            </div>

            {isTryingOut && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-xs">
                    API Key (Optional)
                  </Label>
                  <Input
                    id="api-key"
                    type="text"
                    placeholder="your-api-key-here"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                {endpoint.method !== "GET" && endpoint.request?.body && (
                  <div className="space-y-2">
                    <Label htmlFor="request-body" className="text-xs">
                      Request Body
                    </Label>
                    <Textarea
                      id="request-body"
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                )}

                <Button
                  onClick={handleTryOut}
                  disabled={loading}
                  className="w-full"
                  size="sm"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {loading ? "Loading..." : "Execute"}
                </Button>

                {response && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Response</Label>
                      <Badge
                        variant={response.status >= 200 && response.status < 300 ? "success" : "destructive"}
                      >
                        {response.status || "Error"}
                      </Badge>
                    </div>
                    <CodeBlock>{response.body}</CodeBlock>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* cURL Example */}
          <div>
            <h5 className="mb-2 text-sm font-semibold">cURL Example</h5>
            <CodeBlock language="bash">{curlExample}</CodeBlock>
          </div>

          {/* Response Examples */}
          <div>
            <h5 className="mb-2 text-sm font-semibold">Response Examples</h5>
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
        </div>
      </CollapsibleContent>
    </Collapsible>
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
      className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:text-base prose-h2:tracking-tight prose-h3:text-sm prose-h3:tracking-tight prose-p:text-sm prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:text-slate-50 prose-pre:text-sm dark:prose-pre:bg-slate-900 prose-code:break-anywhere prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-table:text-sm"
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
            CloudMail API
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
                API Endpoints
              </p>
            </div>
            {apiEndpoints.map((ep) => (
              <a
                key={ep.path}
                href={`#${ep.path.replace(/[{}]/g, "").replace(/\//g, "-").slice(1)}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <MethodBadge method={ep.method} />
                <span className="truncate">{ep.title}</span>
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
            <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
            <p className="mt-2 text-muted-foreground">
              Interactive API documentation for CloudMail. Try out endpoints directly from your browser.
            </p>
          </div>

          <section id="quick-start">
            <MarkdownSection>{quickStart}</MarkdownSection>
          </section>

          <section id="authentication">
            <MarkdownSection>{authGuide}</MarkdownSection>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">API Endpoints</h2>
            {apiEndpoints.map((ep) => (
              <SwaggerEndpointCard key={ep.path} endpoint={ep} />
            ))}
          </section>

          <section id="errors">
            <MarkdownSection>{errorCodes}</MarkdownSection>
          </section>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                If the API doesn't work as documented, check the logs in your dashboard or contact your instance admin.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  Open Dashboard
                  <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
