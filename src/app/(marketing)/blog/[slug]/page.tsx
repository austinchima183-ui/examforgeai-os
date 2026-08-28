import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Tag, BookOpen } from 'lucide-react'
import { posts, getPostBySlug, getRelatedPosts, authors } from '@/content/blog'
import { generateArticleSchema, generateBreadcrumbSchema, getCanonicalUrl } from '@/content/seo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { ArticleJsonLd } from '@/components/seo/article-jsonld'
import { BlogCard } from '@/components/blog/blog-card'
import { ShareButtons } from '@/components/blog/share-buttons'
import { NewsletterForm } from '@/components/marketing/newsletter-form'

// ============================================================================
// ExamForge AI — Blog Post Detail Page
// ============================================================================
// Dynamic blog post page with full article rendering, structured data,
// related posts, author bio, share buttons, and newsletter signup.
// ============================================================================

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return { title: 'Post Not Found' }
  }

  const canonicalUrl = getCanonicalUrl(post.seo.canonicalUrl)

  return {
    title: post.seo.metaTitle,
    description: post.seo.metaDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.seo.metaTitle,
      description: post.seo.metaDescription,
      url: canonicalUrl,
      siteName: 'ExamForge AI',
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updatedAt || post.date,
      authors: [`https://examforge.ai/blog/author/${post.author.slug}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo.metaTitle,
      description: post.seo.metaDescription,
    },
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = getRelatedPosts(post)
  const canonicalUrl = getCanonicalUrl(post.seo.canonicalUrl)
  const paragraphs = post.content.split('\n\n').filter(p => p.trim())

  return (
    <>
      {/* Structured Data */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Blog', href: '/blog' },
          { name: post.title, href: `/blog/${post.slug}` },
        ]}
      />
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        authorName={post.author.name}
        authorUrl={`https://examforge.ai/blog/author/${post.author.slug}`}
        datePublished={post.date}
        dateModified={post.updatedAt}
        url={canonicalUrl}
      />

      <article className="pt-16">
        {/* Hero Section */}
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

              {/* Category & Meta */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  {post.category}
                </Badge>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {post.readTime}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-6">
                {post.title}
              </h1>

              {/* Excerpt */}
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                {post.excerpt}
              </p>

              {/* Author */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <Link
                  href={`/blog/author/${post.author.slug}`}
                  className="flex items-center gap-3 group"
                  aria-label={`View profile of ${post.author.name}`}
                >
                  <Avatar className="h-10 w-10 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                      {post.author.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{post.author.name}</p>
                    <p className="text-xs text-muted-foreground">{post.author.role}</p>
                  </div>
                </Link>
                <ShareButtons title={post.title} url={canonicalUrl} />
              </div>
            </div>
          </div>
        </header>

        {/* Cover Gradient */}
        <div className={`h-48 sm:h-56 bg-gradient-to-br ${post.coverGradient}`} aria-hidden="true" />

        {/* Article Body */}
        <section className="py-12 sm:py-16" aria-label="Article content">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="prose-custom">
                {paragraphs.map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-base leading-relaxed text-foreground/90 mb-6"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tags Section */}
        {post.tags.length > 0 && (
          <section className="pb-8" aria-label="Article tags">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <Separator className="mb-6" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground mr-1">Tags:</span>
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Author Bio Card */}
        <section className="py-12" aria-label="About the author">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <Separator className="mb-8" />
              <div className="rounded-xl border-white/[0.06] bg-muted/30 p-6">
                <div className="flex items-start gap-4">
                  <Link href={`/blog/author/${post.author.slug}`}>
                    <Avatar className="h-14 w-14 shrink-0 hover:ring-2 hover:ring-primary/30 transition-all">
                      <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                        {post.author.avatar}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/blog/author/${post.author.slug}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        {post.author.name}
                      </Link>
                      <span className="text-sm text-muted-foreground">·</span>
                      <span className="text-sm text-primary/80">{post.author.role}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {post.author.bio}
                    </p>
                    <div className="flex items-center gap-2">
                      {post.author.twitter && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                          <a href={`https://${post.author.twitter}`} target="_blank" rel="noopener noreferrer" aria-label={`${post.author.name} on Twitter`}>
                            Twitter
                          </a>
                        </Button>
                      )}
                      {post.author.linkedin && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                          <a href={`https://${post.author.linkedin}`} target="_blank" rel="noopener noreferrer" aria-label={`${post.author.name} on LinkedIn`}>
                            LinkedIn
                          </a>
                        </Button>
                      )}
                      {post.author.github && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                          <a href={`https://${post.author.github}`} target="_blank" rel="noopener noreferrer" aria-label={`${post.author.name} on GitHub`}>
                            GitHub
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-12 sm:py-16 bg-muted/30 border-y border-border/40" aria-label="Related articles">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl sm:text-3xl font-bold tracking-tight tracking-tight mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <BlogCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Newsletter */}
        <section className="py-20 sm:py-24" aria-labelledby="post-newsletter-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 id="post-newsletter-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">Enjoyed this article?</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Get more insights delivered to your inbox. Product updates, engineering
                deep-dives, and EdTech thought leadership from the ExamForge AI team.
              </p>
              <NewsletterForm />
            </div>
          </div>
        </section>
      </article>
    </>
  )
}
