import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { authors, getAuthorBySlug, getPostsByAuthor } from '@/content/blog'
import { getCanonicalUrl } from '@/content/seo'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { AuthorJsonLd } from '@/components/seo/author-jsonld'
import { BlogCard } from '@/components/blog/blog-card'

// ============================================================================
// ExamForge AI — Author Page
// ============================================================================
// Dynamic author profile page with Person JSON-LD, author bio,
// social links, and grid of their articles.
// ============================================================================

interface AuthorPageProps {
  params: Promise<{ slug: string }>
}

function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform === 'twitter') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.352 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  }
  if (platform === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.428-.07-3.207-1.955-3.207-1.956 0-2.26 1.528-2.26 3.104v5.672H9.006v-11.50h3.414v1.564h.047c.476-.9 1.633-1.85 3.362-1.85 3.592 0 4.252 2.363 4.252 5.44v6.35zM5.332 6.425a2.063 2.063 0 1 1 0-4.125 2.063 2.063 0 0 1 0 4.125zM6.838 20.452H3.825V8.902h3.013v11.55zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )
  }
  if (platform === 'github') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.522 18.07 3.72 17.73 3.72 17.73c-1.21-.826.092-.812.092-.812 1.34.094 2.044 1.374 2.044 1.374 1.19 2.04 3.122 1.452 3.882 1.11.122-.84.466-1.452.85-1.788-2.996-.34-6.15-1.498-6.15-6.66 0-1.47.525-2.674 1.39-3.616-.14-.34-.605-1.72.13-3.584 0 0 1.13-.362 3.7 1.385a12.86 12.86 0 0 1 3.38-.455c1.15.005 2.305.155 3.38.455 2.57-1.747 3.7-1.385 3.7-1.385.735 1.864.275 3.244.14 3.584.865.942 1.39 2.146 1.39 3.616 0 5.18-3.155 6.316-6.16 6.652.485.418.9 1.242.9 2.508 0 1.81-.015 3.27-.015 3.713 0 .32.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    )
  }
  return null
}

export async function generateStaticParams() {
  return authors.map((author) => ({ slug: author.slug }))
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params
  const author = getAuthorBySlug(slug)

  if (!author) {
    return { title: 'Author Not Found' }
  }

  const canonicalUrl = getCanonicalUrl(`/blog/author/${author.slug}`)
  const title = `${author.name} — ExamForge AI Blog`
  const description = `Articles and insights by ${author.name}, ${author.role} at ExamForge AI. ${author.bio.slice(0, 120)}...`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'ExamForge AI',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params
  const author = getAuthorBySlug(slug)

  if (!author) {
    notFound()
  }

  const authorPosts = getPostsByAuthor(slug)
  const canonicalUrl = getCanonicalUrl(`/blog/author/${author.slug}`)

  const socialLinks: Array<{ platform: string; href: string; label: string }> = []
  if (author.twitter) socialLinks.push({ platform: 'twitter', href: `https://${author.twitter}`, label: 'Twitter' })
  if (author.linkedin) socialLinks.push({ platform: 'linkedin', href: `https://${author.linkedin}`, label: 'LinkedIn' })
  if (author.github) socialLinks.push({ platform: 'github', href: `https://${author.github}`, label: 'GitHub' })

  return (
    <>
      {/* Structured Data */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Blog', href: '/blog' },
          { name: author.name, href: `/blog/author/${author.slug}` },
        ]}
      />
      <AuthorJsonLd
        name={author.name}
        url={canonicalUrl}
        jobTitle={author.role}
        description={author.bio}
        sameAs={socialLinks.map(l => l.href)}
      />

      <div className="pt-16">
        {/* Author Profile Header */}
        <header className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              {/* Back Link */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to Blog
              </Link>

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-xl sm:text-3xl font-bold tracking-tight text-primary">
                    {author.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                    {author.name}
                  </h1>
                  <p className="text-lg text-primary/80 font-medium mb-4">{author.role}</p>
                  <p className="text-muted-foreground leading-relaxed mb-5">
                    {author.bio}
                  </p>

                  {/* Social Links */}
                  {socialLinks.length > 0 && (
                    <div className="flex items-center gap-2">
                      {socialLinks.map((link) => (
                        <Button
                          key={link.href}
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          asChild
                        >
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${author.name} on ${link.label}`}
                          >
                            <SocialIcon platform={link.platform} className="h-3.5 w-3.5" />
                            <span className="text-xs">{link.label}</span>
                          </a>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="border-y border-white/[0.04] bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6 py-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium">
                  {authorPosts.length} {authorPosts.length === 1 ? 'Article' : 'Articles'}
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">
                {author.role} at ExamForge AI
              </span>
            </div>
          </div>
        </div>

        {/* Author's Articles */}
        <section className="py-12 sm:py-16 lg:py-20" aria-label={`Articles by ${author.name}`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight tracking-tight mb-8">
              Articles by {author.name}
            </h2>

            {authorPosts.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-10 w-10 text-foreground/30 mx-auto mb-3" aria-hidden="true" />
                <p className="text-muted-foreground">No articles published yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {authorPosts.map((post) => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
