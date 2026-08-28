'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — Code Block
// ============================================================================
// Client component for syntax-highlighted code display with a GitHub-style
// dark theme, language badge, copy button, and optional line numbers.
// ============================================================================

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
  showLineNumbers?: boolean
  copyable?: boolean
}

// Simple syntax coloring patterns
const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'async',
  'await',
  'import',
  'export',
  'return',
  'class',
  'interface',
  'type',
  'from',
  'if',
  'else',
  'for',
  'while',
  'new',
  'throw',
  'try',
  'catch',
  'finally',
  'switch',
  'case',
  'break',
  'default',
  'extends',
  'implements',
  'enum',
  'namespace',
  'module',
  'declare',
  'readonly',
  'abstract',
  'static',
  'public',
  'private',
  'protected',
  'void',
  'null',
  'undefined',
  'true',
  'false',
  'this',
  'super',
  'yield',
  'of',
  'in',
  'as',
  'instanceof',
])

function tokenizeLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let i = 0

  while (i < line.length) {
    // Comment //
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push(
        <span key={`c-${i}`} className="text-gray-500 italic">
          {line.slice(i)}
        </span>
      )
      return tokens
    }

    // String (single or double quote)
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i]
      let j = i + 1
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++ // skip escaped char
        j++
      }
      j = Math.min(j + 1, line.length)
      tokens.push(
        <span key={`s-${i}`} className="text-emerald-400">
          {line.slice(i, j)}
        </span>
      )
      i = j
      continue
    }

    // Number
    if (/[0-9]/.test(line[i]) && (i === 0 || /[\s(,=+\-*/<>[\]{}!&|:]/.test(line[i - 1]))) {
      let j = i
      while (j < line.length && /[0-9.xXbBoOa-fA-FeE_]/.test(line[j])) j++
      tokens.push(
        <span key={`n-${i}`} className="text-amber-400">
          {line.slice(i, j)}
        </span>
      )
      i = j
      continue
    }

    // Identifier / keyword
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++
      const word = line.slice(i, j)
      if (KEYWORDS.has(word)) {
        tokens.push(
          <span key={`k-${i}`} className="text-purple-400 font-semibold">
            {word}
          </span>
        )
      } else {
        tokens.push(<span key={`i-${i}`}>{word}</span>)
      }
      i = j
      continue
    }

    // Operators and punctuation
    if (/[<>]/.test(line[i])) {
      tokens.push(
        <span key={`o-${i}`} className="text-cyan-400">
          {line[i]}
        </span>
      )
      i++
      continue
    }

    // Default: plain character
    tokens.push(<span key={`d-${i}`}>{line[i]}</span>)
    i++
  }

  return tokens
}

const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  py: 'Python',
  rb: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  sh: 'Shell',
  bash: 'Bash',
  sql: 'SQL',
  graphql: 'GraphQL',
  prisma: 'Prisma',
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  copyable = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const lines = code.split('\n')
  const langLabel = LANGUAGE_LABELS[language.toLowerCase()] ?? language.toUpperCase()

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-gray-700 overflow-hidden',
        'bg-[#0d1117] text-gray-200'
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-[#161b22] px-4 py-2">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs text-gray-400 font-mono">{filename}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-gray-700/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {langLabel}
          </span>
          {copyable && (
            <button
              onClick={handleCopy}
              className="flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-[#0d1117]"
              aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="size-3.5 text-emerald-400" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy className="size-3.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          <code className="font-mono">
            {lines.map((line, lineIdx) => (
              <div key={lineIdx} className="flex">
                {showLineNumbers && (
                  <span
                    className="mr-4 inline-block w-6 select-none text-right text-gray-600"
                    aria-hidden="true"
                  >
                    {lineIdx + 1}
                  </span>
                )}
                <span className="flex-1">{tokenizeLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}
