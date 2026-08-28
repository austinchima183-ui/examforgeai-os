// ============================================================================
// ExamForge AI — SEO Content & Structured Data Helpers
// ============================================================================
// Centralized SEO configuration, topic clusters, author pages,
// structured data generators, and internal linking map.
// ============================================================================

// ─── Topic Clusters ───

export interface TopicCluster {
  name: string
  description: string
  pillarPage: { title: string; slug: string; href: string }
  clusterPages: Array<{ title: string; slug: string; href: string }>
  keywords: string[]
}

export const topicClusters: TopicCluster[] = [
  {
    name: 'AI in Education',
    description: 'Comprehensive coverage of artificial intelligence applications in African education, from question generation to predictive analytics.',
    pillarPage: { title: 'How AI is Transforming CBT Examinations in African Schools', slug: 'ai-transforming-cbt-african-schools', href: '/blog/ai-transforming-cbt-african-schools' },
    clusterPages: [
      { title: 'AI Essay Scoring with 95% Accuracy', slug: 'ai-essay-scoring-breakthrough', href: '/blog/ai-essay-scoring-breakthrough' },
      { title: 'WAEC, NECO, JAMB: Aligning AI Questions', slug: 'waec-neco-jamb-ai-standards', href: '/blog/waec-neco-jamb-ai-standards' },
      { title: 'Adaptive Learning and Personalized Paths', slug: 'adaptive-learning-personalized-paths', href: '/blog/adaptive-learning-personalized-paths' },
      { title: 'Predictive Analytics for At-Risk Students', slug: 'predictive-analytics-at-risk-students', href: '/blog/predictive-analytics-at-risk-students' },
    ],
    keywords: ['AI in education', 'artificial intelligence schools', 'AI exam generation', 'automated marking', 'AI CBT', 'machine learning education Africa'],
  },
  {
    name: 'CBT Exams',
    description: 'Everything about computer-based testing in African schools — technology, best practices, security, and student preparation.',
    pillarPage: { title: 'CBT Platform Documentation', slug: 'cbt-platform', href: '/docs' },
    clusterPages: [
      { title: '10 Strategies for CBT Exam Success', slug: 'exam-tips-effective-cbt-preparation', href: '/blog/exam-tips-effective-cbt-preparation' },
      { title: 'Grace School: Paper to CBT in 3 Weeks', slug: 'grace-school-digital-transformation', href: '/blog/grace-school-digital-transformation' },
      { title: 'LASU: Eliminating Exam Paper Leaks', slug: 'lagos-state-university-case-study', href: '/blog/lagos-state-university-case-study' },
      { title: 'Offline-First Architecture', slug: 'building-low-connectivity-offline-first', href: '/blog/building-low-connectivity-offline-first' },
    ],
    keywords: ['CBT exam', 'computer-based testing Nigeria', 'JAMB CBT', 'WAEC digital', 'online exam platform', 'CBT preparation'],
  },
  {
    name: 'School Management',
    description: 'End-to-end school administration technology — student information systems, ERP, analytics, and parent communication.',
    pillarPage: { title: 'Platform Features', slug: 'features', href: '/features' },
    clusterPages: [
      { title: 'Multi-School Analytics Dashboard', slug: 'multi-school-analytics-dashboard', href: '/blog/multi-school-analytics-dashboard' },
      { title: 'Marketplace Launch', slug: 'examforge-marketplace-launch', href: '/blog/examforge-marketplace-launch' },
      { title: 'Ministry Partnerships', slug: 'ministry-partnership-education-digitalization', href: '/blog/ministry-partnership-education-digitalization' },
    ],
    keywords: ['school management software', 'school ERP', 'student information system', 'school administration', 'education management platform'],
  },
  {
    name: 'Student Analytics',
    description: 'Data-driven insights into student performance, predictive modeling, and early intervention systems.',
    pillarPage: { title: 'Predictive Analytics: At-Risk Students', slug: 'predictive-analytics-at-risk-students', href: '/blog/predictive-analytics-at-risk-students' },
    clusterPages: [
      { title: 'Adaptive Learning Paths', slug: 'adaptive-learning-personalized-paths', href: '/blog/adaptive-learning-personalized-paths' },
      { title: 'Multi-School Analytics', slug: 'multi-school-analytics-dashboard', href: '/blog/multi-school-analytics-dashboard' },
      { title: 'Analytics & Reports Documentation', slug: 'analytics-reports', href: '/docs' },
    ],
    keywords: ['student analytics', 'predictive analytics education', 'at-risk students', 'student retention', 'performance analytics', 'early warning system'],
  },
  {
    name: 'Exam Security',
    description: 'Anti-cheating measures, proctoring, data protection, and compliance for high-stakes assessments.',
    pillarPage: { title: 'Security & Compliance', slug: 'security', href: '/security' },
    clusterPages: [
      { title: 'Student Data Privacy', slug: 'securing-student-data-privacy', href: '/blog/securing-student-data-privacy' },
      { title: 'Offline-First Architecture', slug: 'building-low-connectivity-offline-first', href: '/blog/building-low-connectivity-offline-first' },
      { title: 'LASU Case Study', slug: 'lagos-state-university-case-study', href: '/blog/lagos-state-university-case-study' },
    ],
    keywords: ['exam security', 'anti-cheating CBT', 'proctoring', 'exam integrity', 'GDPR education', 'data protection schools'],
  },
  {
    name: 'Education Technology in Africa',
    description: 'The broader landscape of edtech adoption across the African continent, policy developments, and market trends.',
    pillarPage: { title: 'About ExamForge AI', slug: 'about', href: '/about' },
    clusterPages: [
      { title: 'Ministry Partnerships', slug: 'ministry-partnership-education-digitalization', href: '/blog/ministry-partnership-education-digitalization' },
      { title: 'Series A Funding Announcement', slug: 'series-a-funding-announcement', href: '/blog/series-a-funding-announcement' },
      { title: 'AI Transforming CBT', slug: 'ai-transforming-cbt-african-schools', href: '/blog/ai-transforming-cbt-african-schools' },
    ],
    keywords: ['edtech Africa', 'education technology Nigeria', 'digital transformation schools', 'African edtech', 'education innovation'],
  },
]

// ─── Author Pages ───

export interface AuthorPage {
  slug: string
  name: string
  bio: string
  role: string
  specialties: string[]
  socialLinks: { twitter?: string; linkedin?: string; github?: string }
  articleSlugs: string[]
}

export const authorPages: AuthorPage[] = [
  {
    slug: 'austin-chima',
    name: 'Austin Chima',
    bio: 'Austin founded ExamForge AI after experiencing the challenges of exam administration firsthand as a university lecturer in Nigeria. With a background in software engineering and educational technology, he leads the company\'s vision to transform assessment across Africa.',
    role: 'Founder & CEO',
    specialties: ['Education Technology', 'AI in Assessment', 'African EdTech', 'School Digital Transformation'],
    socialLinks: { twitter: 'https://twitter.com/austinchima', linkedin: 'https://linkedin.com/in/austinchima', github: 'https://github.com/austinchima' },
    articleSlugs: ['ai-transforming-cbt-african-schools', 'series-a-funding-announcement', 'lagos-state-university-case-study', 'ministry-partnership-education-digitalization'],
  },
  {
    slug: 'emeka-nwosu',
    name: 'Emeka Nwosu',
    bio: 'Emeka brings over 12 years of experience in distributed systems and cloud infrastructure. He architected the platform\'s offline-first architecture and auto-scaling exam delivery system.',
    role: 'Chief Technology Officer',
    specialties: ['Distributed Systems', 'Cloud Infrastructure', 'Offline-First Architecture', 'Auto-Scaling'],
    socialLinks: { twitter: 'https://twitter.com/emekanwosu', linkedin: 'https://linkedin.com/in/emekanwosu', github: 'https://github.com/emekanwosu' },
    articleSlugs: ['building-low-connectivity-offline-first', 'scaling-national-exams-infrastructure'],
  },
  {
    slug: 'ada-okafor',
    name: 'Dr. Ada Okafor',
    bio: 'Dr. Okafor holds a PhD in Machine Learning from the University of Ibadan and leads AI research. Her work on curriculum-aligned question generation and automated essay scoring has been published in leading educational technology journals.',
    role: 'Head of AI Research',
    specialties: ['Machine Learning', 'NLP', 'Question Generation', 'Essay Scoring', 'Curriculum Alignment'],
    socialLinks: { twitter: 'https://twitter.com/adaokafor', linkedin: 'https://linkedin.com/in/adaokafor' },
    articleSlugs: ['waec-neco-jamb-ai-standards', 'ai-essay-scoring-breakthrough'],
  },
  {
    slug: 'zainab-musa',
    name: 'Zainab Musa',
    bio: 'Zainab drives product strategy with 8 years of product management in African SaaS. She has a deep understanding of the unique requirements of African schools.',
    role: 'VP of Product',
    specialties: ['Product Strategy', 'African SaaS', 'EdTech Product Management', 'User Experience'],
    socialLinks: { twitter: 'https://twitter.com/zainabmusa', linkedin: 'https://linkedin.com/in/zainabmusa' },
    articleSlugs: ['grace-school-digital-transformation', 'examforge-marketplace-launch', 'multi-school-analytics-dashboard', 'exam-tips-effective-cbt-preparation'],
  },
  {
    slug: 'chidi-eze',
    name: 'Chidi Eze',
    bio: 'Chidi specializes in predictive analytics and educational data mining. He built the at-risk student identification system that helps partner universities reduce dropout rates by up to 23%.',
    role: 'Senior Data Scientist',
    specialties: ['Predictive Analytics', 'Educational Data Mining', 'Student Retention', 'Machine Learning'],
    socialLinks: { twitter: 'https://twitter.com/chidieze', linkedin: 'https://linkedin.com/in/chidieze' },
    articleSlugs: ['predictive-analytics-at-risk-students', 'adaptive-learning-personalized-paths'],
  },
  {
    slug: 'amina-bello',
    name: 'Amina Bello',
    bio: 'Amina oversees security architecture, data protection, and compliance with CISSP and CIPP/A certifications. She led the SOC 2 Type II certification process.',
    role: 'Security & Compliance Lead',
    specialties: ['Information Security', 'Data Protection', 'GDPR', 'NDPR', 'SOC 2 Compliance'],
    socialLinks: { linkedin: 'https://linkedin.com/in/aminabello' },
    articleSlugs: ['securing-student-data-privacy'],
  },
]

// ─── Internal Linking Map ───

export interface InternalLink {
  title: string
  href: string
  description: string
}

export const internalLinkingMap: Record<string, InternalLink[]> = {
  '/': [
    { title: 'Features', href: '/features', description: 'Explore all platform capabilities' },
    { title: 'Pricing', href: '/pricing', description: 'Plans for every school size' },
    { title: 'Case Studies', href: '/case-studies', description: 'Real results from real institutions' },
    { title: 'Book a Demo', href: '/demo', description: 'See the platform in action' },
  ],
  '/features': [
    { title: 'Documentation', href: '/docs', description: 'Detailed feature guides' },
    { title: 'API Reference', href: '/api-docs', description: 'Developer integration docs' },
    { title: 'Pricing', href: '/pricing', description: 'Plan comparison' },
    { title: 'Case Studies', href: '/case-studies', description: 'How schools use each feature' },
  ],
  '/pricing': [
    { title: 'Book a Demo', href: '/demo', description: 'Custom pricing walkthrough' },
    { title: 'Case Studies', href: '/case-studies', description: 'ROI examples by plan' },
    { title: 'Documentation', href: '/docs', description: 'Feature availability by plan' },
    { title: 'Contact Sales', href: '/contact', description: 'Enterprise pricing inquiry' },
  ],
  '/docs': [
    { title: 'API Reference', href: '/api-docs', description: 'REST API documentation' },
    { title: 'Help Center', href: '/help-center', description: 'FAQs and support' },
    { title: 'Blog', href: '/blog', description: 'Product updates and guides' },
    { title: 'Changelog', href: '/changelog', description: 'Latest releases' },
  ],
  '/blog': [
    { title: 'Documentation', href: '/docs', description: 'Technical deep-dives' },
    { title: 'Changelog', href: '/changelog', description: 'Product releases' },
    { title: 'Case Studies', href: '/case-studies', description: 'Customer success stories' },
    { title: 'Help Center', href: '/help-center', description: 'Get support' },
  ],
  '/case-studies': [
    { title: 'Customers', href: '/customers', description: 'All customer stories' },
    { title: 'Pricing', href: '/pricing', description: 'See plans and pricing' },
    { title: 'Book a Demo', href: '/demo', description: 'See it for yourself' },
    { title: 'Blog', href: '/blog', description: 'Related articles' },
  ],
  '/api-docs': [
    { title: 'Documentation', href: '/docs', description: 'Integration guides' },
    { title: 'Community', href: '/community', description: 'Developer community' },
    { title: 'Changelog', href: '/changelog', description: 'API version updates' },
    { title: 'Help Center', href: '/help-center', description: 'Developer support' },
  ],
  '/help-center': [
    { title: 'Documentation', href: '/docs', description: 'Detailed guides' },
    { title: 'API Reference', href: '/api-docs', description: 'Developer docs' },
    { title: 'Contact Us', href: '/contact', description: 'Talk to support' },
    { title: 'Blog', href: '/blog', description: 'Tips and updates' },
  ],
}

// ─── Structured Data Generators ───

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ExamForge AI',
    url: 'https://examforge.ai',
    logo: 'https://examforge.ai/logo.png',
    description: 'The AI Operating System for Modern Schools. One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI.',
    foundingDate: '2023',
    founders: [
      { '@type': 'Person', name: 'Austin Chima', jobTitle: 'Founder & CEO' },
    ],
    sameAs: [
      'https://twitter.com/examforgeai',
      'https://linkedin.com/company/examforgeai',
      'https://github.com/examforgeai',
      'https://youtube.com/@examforgeai',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'hello@examforge.ai',
        availableLanguage: ['English'],
        areaServed: [{ '@type': 'Place', name: 'Nigeria' }, { '@type': 'Place', name: 'Kenya' }, { '@type': 'Place', name: 'Ghana' }, { '@type': 'Place', name: 'South Africa' }],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@examforge.ai',
        availableLanguage: ['English'],
      },
    ],
    areaServed: [
      { '@type': 'Place', name: 'Nigeria' },
      { '@type': 'Place', name: 'Kenya' },
      { '@type': 'Place', name: 'Ghana' },
      { '@type': 'Place', name: 'South Africa' },
    ],
  }
}

export function generateSoftwareAppSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ExamForge AI',
    description: 'The AI Operating System for Modern Schools. One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI.',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: 'https://examforge.ai',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '39',
      highPrice: '149',
      offerCount: '3',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '500',
      bestRating: '5',
      worstRating: '1',
    },
  }
}

export function generateArticleSchema(params: {
  title: string
  description: string
  authorName: string
  datePublished: string
  dateModified?: string
  url: string
  imageUrl?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    description: params.description,
    author: {
      '@type': 'Person',
      name: params.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ExamForge AI',
      url: 'https://examforge.ai',
      logo: { '@type': 'ImageObject', url: 'https://examforge.ai/logo.png' },
    },
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
    mainEntityOfPage: params.url,
    ...(params.imageUrl ? { image: params.imageUrl } : {}),
  }
}

export function generateHowToSchema(params: {
  name: string
  description: string
  steps: Array<{ name: string; text: string }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.name,
    description: params.description,
    step: params.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  }
}

export function generateCourseSchema(params: {
  name: string
  description: string
  provider: string
  courseCode?: string
  educationalLevel?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: params.name,
    description: params.description,
    provider: {
      '@type': 'Organization',
      name: params.provider,
    },
    ...(params.courseCode ? { courseCode: params.courseCode } : {}),
    ...(params.educationalLevel ? { educationalLevel: params.educationalLevel } : {}),
  }
}

export function generateFAQSchema(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function generateBreadcrumbSchema(items: Array<{ name: string; href: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `https://examforge.ai${item.href}`,
    })),
  }
}

export function generatePersonSchema(params: {
  name: string
  url: string
  jobTitle: string
  description: string
  sameAs?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: params.name,
    url: params.url,
    jobTitle: params.jobTitle,
    description: params.description,
    ...(params.sameAs ? { sameAs: params.sameAs } : {}),
  }
}

export function generateWebPageSchema(params: {
  title: string
  description: string
  url: string
  type?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': params.type || 'WebPage',
    name: params.title,
    description: params.description,
    url: params.url,
    publisher: {
      '@type': 'Organization',
      name: 'ExamForge AI',
      url: 'https://examforge.ai',
    },
  }
}

// ─── Canonical URL Helper ───

export function getCanonicalUrl(path: string): string {
  const base = 'https://examforge.ai'
  return `${base}${path}`
}

// ─── Dynamic Metadata Generator ───

export function generateMetadata(params: {
  title: string
  description: string
  path: string
  image?: string
  type?: string
}) {
  return {
    title: params.title,
    description: params.description,
    alternates: { canonical: getCanonicalUrl(params.path) },
    openGraph: {
      title: params.title,
      description: params.description,
      url: getCanonicalUrl(params.path),
      siteName: 'ExamForge AI',
      type: params.type || 'website',
      ...(params.image ? { images: [{ url: params.image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: params.title,
      description: params.description,
      ...(params.image ? { images: [params.image] } : {}),
    },
  }
}
