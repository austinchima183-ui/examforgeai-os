'use client'

import { useState } from 'react'
import { Key, ChevronDown, ChevronRight } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/docs/code-block'
import { ApiMethodBadge } from '@/components/docs/api-method-badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { APIEndpoint } from '@/content/api-reference'

// ============================================================================
// ExamForge AI — API Endpoint Browser (Client Component)
// ============================================================================
// Tabbed interface that groups API endpoints by tag, showing method badge,
// path, description, auth icon, params table, and code examples.
// ============================================================================

interface TagData {
  slug: string
  name: string
  description: string
  endpoints: APIEndpoint[]
}

interface EndpointBrowserProps {
  tags: TagData[]
}

function EndpointCard({ endpoint }: { endpoint: APIEndpoint }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden hover:border-primary/20 transition-colors">
      <button
        className="w-full p-4 text-left flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`endpoint-${endpoint.path.replace(/\//g, '-')}`}
      >
        <ApiMethodBadge method={endpoint.method} />
        <code className="text-sm font-mono text-foreground flex-1">{endpoint.path}</code>
        {endpoint.auth && (
          <Key className="h-3.5 w-3.5 text-muted-foreground" aria-label="Requires authentication" />
        )}
        {endpoint.rateLimit && (
          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
            {endpoint.rateLimit}
          </Badge>
        )}
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Summary always visible */}
      <div className="px-4 pb-3 -mt-1">
        <p className="text-sm text-muted-foreground">{endpoint.description}</p>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          id={`endpoint-${endpoint.path.replace(/\//g, '-')}`}
          className="border-t border-border/40 px-4 py-4 space-y-4 bg-muted/10"
        >
          {/* Parameters */}
          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Parameters</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Required</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoint.params.map((param) => (
                    <TableRow key={param.name}>
                      <TableCell className="font-mono text-xs">{param.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{param.type}</TableCell>
                      <TableCell className="text-xs">
                        {param.required ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Required</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{param.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Request Body */}
          {endpoint.requestBody && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Request Body</h4>
              <CodeBlock
                code={endpoint.requestBody.example}
                language="json"
                filename="request.json"
                showLineNumbers={false}
              />
            </div>
          )}

          {/* Response Body */}
          {endpoint.responseBody && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Response</h4>
              <CodeBlock
                code={endpoint.responseBody.example}
                language="json"
                filename="response.json"
                showLineNumbers={false}
              />
            </div>
          )}

          {/* Code Examples */}
          {endpoint.codeExamples && endpoint.codeExamples.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Code Examples</h4>
              <div className="space-y-3">
                {endpoint.codeExamples.map((example) => (
                  <div key={example.language}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px]">{example.language}</Badge>
                    </div>
                    <CodeBlock
                      code={example.code}
                      language={example.language === 'TypeScript' ? 'ts' : example.language === 'Python' ? 'py' : 'js'}
                      showLineNumbers
                    />
                    {example.response && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Response</p>
                        <CodeBlock
                          code={example.response}
                          language="json"
                          showLineNumbers={false}
                          copyable={false}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rate Limit */}
          {endpoint.rateLimit && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">Rate Limit:</span>
              <span>{endpoint.rateLimit}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EndpointBrowser({ tags }: EndpointBrowserProps) {
  return (
    <Tabs defaultValue={tags[0]?.slug ?? 'auth'} className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full sm:w-auto">
        {tags.map((tag) => (
          <TabsTrigger key={tag.slug} value={tag.slug} className="text-xs">
            {tag.name}
            <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0">
              {tag.endpoints.length}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {tags.map((tag) => (
        <TabsContent key={tag.slug} value={tag.slug}>
          <p className="text-sm text-muted-foreground mb-6">{tag.description}</p>
          <div className="space-y-3">
            {tag.endpoints.map((endpoint) => (
              <EndpointCard key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
