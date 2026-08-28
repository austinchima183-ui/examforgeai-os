import type { Metadata } from 'next'
import { posts, authors, categories, getFeaturedPost } from '@/content/blog'
import { generateOrganizationSchema, generateArticleSchema } from '@/content/seo'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { ArticleJsonLd } from '@/components/seo/article-jsonld'
import { BlogIndexClient } from '@/components/blog/blog-index-client'

// ============================================================================
// ExamForge AI — Enhanced Blog Index Page
// ============================================================================
// Server component that provides data and structured data, then delegates
// interactive functionality to the BlogIndexClient component.
// ============================================================================

export const metadata: Metadata = {
  title: 'Blog — ExamForge AI',
  description:
    'Insights, product updates, and educational technology articles from the ExamForge AI team. Stay informed about the future of school technology.',
  alternates: { canonical: 'https://examforge.ai/blog' },
  openGraph: {
    title: 'Blog — ExamForge AI',
    description:
      'Insights, product updates, and educational technology articles from the ExamForge AI team.',
    url: 'https://examforge.ai/blog',
    siteName: 'ExamForge AI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — ExamForge AI',
    description:
      'Insights, product updates, and educational technology articles from the ExamForge AI team.',
  },
}

export default function BlogPage() {
  const featuredPost = getFeaturedPost()

  return (
    <div className="bg-[#090909]">
      {/* Structured Data */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Resources', href: '/blog' },
          { name: 'Blog', href: '/blog' },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateOrganizationSchema()),
        }}
      />
      {featuredPost && (
        <ArticleJsonLd
          title={featuredPost.title}
          description={featuredPost.excerpt}
          authorName={featuredPost.author.name}
          authorUrl={`https://examforge.ai/blog/author/${featuredPost.author.slug}`}
          datePublished={featuredPost.date}
          dateModified={featuredPost.updatedAt}
          url={`https://examforge.ai${featuredPost.seo.canonicalUrl}`}
        />
      )}

      {/* Client Component with Search/Filter */}
      <BlogIndexClient posts={posts} authors={authors} categories={categories} />
    </div>
  )
}
