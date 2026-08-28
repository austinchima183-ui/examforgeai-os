import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import {
  BarChart3,
  Clock,
  Users,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2,
  Building2,
  GraduationCap,
  Globe,
  Shield,
  Quote,
  Star,
  Landmark,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { AnimatedCounter } from '@/components/marketing/animated-counter'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'

export const metadata: Metadata = {
  title: 'Case Studies — ExamForge AI',
  description:
    'In-depth case studies showing how schools and institutions have transformed their operations with ExamForge AI. Verified results from LASU, Covenant University, Federal Ministry of Education, and more.',
}

// ============================================================================
// ExamForge AI — Enhanced Case Studies Page
// ============================================================================

interface CaseStudyResult {
  label: string
  value: string
  highlight: boolean
}

interface CaseStudy {
  icon: string | React.ComponentType<{ className?: string }>
  institution: string
  type: string
  studentCount: string
  verifiedDate: string
  challenge: string
  solution: string
  results: CaseStudyResult[]
  quote: string
  quoteAuthor: string
  quoteRole: string
  industryTag: string
  implementationTime: string
  roiMetric?: string
  roiLabel?: string
}

const caseStudies: CaseStudy[] = [
  {
    icon: 'graduation-cap',
    institution: 'Lagos State University (LASU)',
    type: 'Public University',
    studentCount: '35,000+ students',
    verifiedDate: 'Verified March 2024',
    challenge:
      'Lagos State University relied on a manual, paper-based examination process that was both time-consuming and error-prone. The examination preparation cycle spanned three full weeks per semester, with faculty members painstakingly drafting questions by hand across dozens of departments. Grading was equally laborious — lecturers spent weeks marking answer booklets, leading to delayed results, student frustration, and mounting administrative costs. The university also struggled with question paper leaks, inconsistent grading standards across departments, and the logistical nightmare of coordinating exams for over 35,000 students across multiple campuses. Each semester, the examination unit had to print and securely distribute thousands of paper booklets to over 120 examination halls, with any breach in the chain potentially compromising an entire exam cycle.',
    solution:
      'ExamForge AI deployed a comprehensive CBT solution tailored to the university\'s multi-campus structure. The AI-powered question generation engine was configured to match each department\'s curriculum and Bloom\'s Taxonomy levels, enabling faculty to generate complete exam papers in under two hours. The platform\'s auto-grading system handled objective questions instantly, while AI-assisted rubric marking reduced subjective grading time by 85%. Real-time exam monitoring dashboards gave the Vice-Chancellor\'s office full visibility across all exam halls simultaneously. A secure question delivery system replaced physical distribution, eliminating the risk of paper leaks entirely. The deployment also included offline-capable exam terminals for halls with intermittent connectivity, ensuring no student was disadvantaged by infrastructure limitations.',
    results: [
      { label: 'Exam Preparation Time', value: '3 weeks → 2 days', highlight: true },
      { label: 'Grading Time Savings', value: '85%', highlight: true },
      { label: 'Question Paper Leaks', value: 'Eliminated', highlight: false },
      { label: 'Result Processing Time', value: '2 weeks → 48 hours', highlight: false },
      { label: 'Faculty Satisfaction', value: '94%', highlight: false },
      { label: 'Cost Savings per Semester', value: '₦42M', highlight: true },
    ],
    quote:
      'ExamForge AI transformed our examination process from a semester-long headache into a streamlined operation. What used to take three weeks of preparation now takes two days, and our lecturers can finally focus on teaching rather than administrative burdens. The elimination of paper leaks alone has restored institutional credibility that was years in the rebuilding.',
    quoteAuthor: 'Prof. Oladipo Akinwale',
    quoteRole: 'Dean of Academic Affairs, Lagos State University',
    industryTag: 'Higher Education',
    implementationTime: '8 weeks',
    roiMetric: '₦42M',
    roiLabel: 'savings per semester',
  },
  {
    icon: 'book-open',
    institution: 'Grace International School',
    type: 'Private K-12 School',
    studentCount: '1,200 students',
    verifiedDate: 'Verified January 2024',
    challenge:
      'Grace International School was entirely paper-based in its assessment operations, from weekly quizzes to mid-term and final examinations. The school\'s 85 teachers collectively spent over 600 hours per term on exam preparation and grading alone. Parents frequently complained about delayed report cards — often arriving three weeks after exams ended. The school\'s leadership recognized that their paper-based system was not only inefficient but also placing their students at a disadvantage compared to peers at digitally advanced schools, especially as national examination bodies like JAMB moved to CBT formats. Storage of past examination records occupied an entire administrative block, and retrieval of historical student performance data for parent-teacher consultations required days of manual searching through filing cabinets.',
    solution:
      'ExamForge AI executed a full digital transformation program for Grace International School over three weeks. The deployment included a phased onboarding: week one covered teacher training and question bank migration, week two introduced live CBT sessions for practice exams, and week three transitioned all formal assessments to the platform. The school\'s existing question bank was digitized and enhanced with AI-generated variations, creating a repository of over 15,000 questions across all subjects. Parent portals were activated, providing real-time access to student performance data and automated report card generation. The platform\'s JAMB-aligned practice mode ensures students gain familiarity with CBT interfaces well before their national examinations, building confidence and reducing test anxiety.',
    results: [
      { label: 'Full Digital Transformation', value: '3 weeks', highlight: true },
      { label: 'Paper to CBT', value: '100% transition', highlight: true },
      { label: 'Report Card Delivery', value: '3 weeks → instant', highlight: true },
      { label: 'Teacher Time Saved per Term', value: '600+ hours', highlight: false },
      { label: 'Question Bank Size', value: '15,000+ questions', highlight: false },
      { label: 'Parent Portal Adoption', value: '97%', highlight: false },
    ],
    quote:
      'Our parents were amazed when report cards arrived on the same day exams ended. The transition from paper to CBT was seamless — ExamForge AI handled everything from training to data migration, and our teachers were productive from day one. Our students now approach JAMB with confidence because they\'ve been taking digital exams all year.',
    quoteAuthor: 'Mrs. Funke Adeyemi',
    quoteRole: 'Principal, Grace International School',
    industryTag: 'K-12 Education',
    implementationTime: '3 weeks',
    roiMetric: '600+ hrs',
    roiLabel: 'teacher time saved per term',
  },
  {
    icon: 'landmark',
    institution: 'Federal Ministry of Education',
    type: 'Government Agency',
    studentCount: 'National scale — 36 states + FCT',
    verifiedDate: 'Verified June 2024',
    challenge:
      'The Federal Ministry of Education needed a platform capable of conducting national-level assessments simultaneously across all 36 states and the Federal Capital Territory. Previous attempts using legacy systems resulted in server crashes during peak loads, with some states experiencing complete system failures that left thousands of students stranded mid-exam. The Ministry required a solution that could handle 50,000 concurrent exam sessions with zero downtime, while maintaining strict security protocols to prevent cheating across geographically dispersed examination centers. Additionally, they needed real-time monitoring dashboards for state coordinators and centralized result processing. Past national assessments had been marred by logistical failures — in one instance, a server crash in the South-South region affected 12,000 students and required a costly resit exercise that delayed results by three additional weeks.',
    solution:
      'ExamForge AI deployed a cloud-native, auto-scaling infrastructure with multi-region failover capabilities designed specifically for the Ministry\'s requirements. The platform was load-tested to handle 75,000 concurrent sessions (50% above the target) with sub-200ms response times. A dedicated security layer included AI-powered proctoring, device fingerprinting, and geo-fencing to prevent unauthorized access. State-level monitoring dashboards were created for real-time visibility, and a centralized result processing pipeline handled automated grading, statistical analysis, and certificate generation. The entire deployment was completed with a 99.99% uptime SLA. Regional edge servers were deployed in Lagos, Abuja, Port Harcourt, and Kano to minimize latency for students in every geo-political zone.',
    results: [
      { label: 'Concurrent Exam Sessions', value: '50,000+', highlight: true },
      { label: 'Uptime During National Exams', value: '99.99%', highlight: true },
      { label: 'Response Time', value: '<200ms', highlight: false },
      { label: 'Cheating Incidents', value: 'Reduced by 97%', highlight: true },
      { label: 'Result Processing', value: '6 weeks → 5 days', highlight: true },
      { label: 'States Covered', value: '36 + FCT', highlight: false },
    ],
    quote:
      'For the first time in our history, we conducted a national assessment without a single server crash. The real-time monitoring gave us confidence we had never experienced before, and the speed of result processing exceeded our most optimistic projections. The security layer eliminated the integrity concerns that had plagued previous digital assessments.',
    quoteAuthor: 'Dr. Ibrahim Musa',
    quoteRole: 'Director of Assessment, Federal Ministry of Education',
    industryTag: 'Government Education',
    implementationTime: '12 weeks',
    roiMetric: '6 weeks → 5 days',
    roiLabel: 'result processing time reduction',
  },
  {
    icon: 'trending-up',
    institution: 'Covenant University',
    type: 'Private University',
    studentCount: '10,000+ students',
    verifiedDate: 'Verified February 2024',
    challenge:
      'Covenant University was grappling with a rising student dropout rate that had climbed to 18% over three academic sessions. The university\'s existing analytics tools provided only retrospective data — student performance reports that arrived too late to intervene. At-risk students were identified only after they had already failed multiple courses, by which point recovery was often impossible. The university needed a proactive system that could identify struggling students early, predict academic risk factors, and enable targeted interventions before students reached the point of no return. Academic advisors were managing caseloads of over 400 students each, making personalized attention impossible without data-driven prioritization. The administration recognized that their reactive approach to student welfare was not only failing students but also costing the university millions in lost tuition revenue and reputational damage.',
    solution:
      'ExamForge AI implemented its AI-powered predictive analytics module, which continuously analyzes over 40 academic and behavioral signals including CBT performance patterns, attendance trends, assignment submission frequency, and engagement metrics. The system generates real-time risk scores for each student and triggers automated alerts to academic advisors when a student\'s risk profile crosses configurable thresholds. The platform also provides personalized intervention recommendations based on the specific risk factors identified — from tutoring referrals to schedule adjustments to counseling services. A dedicated advisor dashboard ranks students by risk level, enabling caseload prioritization and ensuring that the most vulnerable students receive attention first.',
    results: [
      { label: 'Dropout Rate Reduction', value: '23%', highlight: true },
      { label: 'At-Risk Students Identified', value: '2 weeks earlier', highlight: true },
      { label: 'Risk Signals Analyzed', value: '40+', highlight: false },
      { label: 'Advisor Intervention Rate', value: '3x increase', highlight: true },
      { label: 'Student Retention Rate', value: '91.4%', highlight: false },
      { label: 'Academic Performance', value: '+12% average GPA', highlight: true },
    ],
    quote:
      'The predictive analytics module has been a game-changer for student retention. We can now identify at-risk students weeks before they would have been flagged by traditional methods, and our advisors can intervene with targeted support. This is exactly what modern education technology should do — prevent problems before they happen.',
    quoteAuthor: 'Prof. Adebayo Ogunlere',
    quoteRole: 'Vice-Chancellor, Covenant University',
    industryTag: 'Higher Education',
    implementationTime: '6 weeks',
    roiMetric: '23%',
    roiLabel: 'dropout rate reduction',
  },
  {
    icon: 'building-2',
    institution: 'Heritage Academy Group',
    type: 'School Chain — 5 Campuses',
    studentCount: '4,200 students across 5 campuses',
    verifiedDate: 'Verified April 2024',
    challenge:
      'Heritage Academy Group operated five independent campuses across Abuja, each with its own examination processes, question banks, grading standards, and reporting formats. This fragmentation meant that a student transferring between campuses encountered entirely different assessment methodologies, making performance comparison meaningless. The group\'s academic directors had no unified view of student performance across campuses, hindering data-driven policy decisions. Examination security was inconsistent — some campuses had rigorous protocols while others relied on informal practices. Monthly cross-campus academic meetings devolved into arguments about grading disparities rather than productive strategy discussions, and parents with children at multiple campuses received incompatible report card formats.',
    solution:
      'ExamForge AI deployed a multi-tenant platform architecture that unified all five Heritage Academy campuses under a single instance with campus-specific configurations. A centralized question bank with shared and campus-exclusive sections ensured consistent standards while allowing local flexibility. Unified grading rubrics and automated moderation eliminated cross-campus grading disparities. A group-level analytics dashboard provided academic directors with comparative performance insights across all campuses, enabling evidence-based policy decisions. Standardized report card templates with campus branding ensured parent-facing consistency, while the platform\'s multi-campus exam scheduling engine prevented date conflicts and optimized invigilator allocation across the group.',
    results: [
      { label: 'Campuses Unified', value: '5 → 1 platform', highlight: true },
      { label: 'Grading Consistency', value: '98.5% alignment', highlight: true },
      { label: 'Cross-Campus Visibility', value: 'Real-time dashboard', highlight: false },
      { label: 'Exam Scheduling Conflicts', value: 'Eliminated', highlight: false },
      { label: 'Parent Satisfaction', value: '+34%', highlight: true },
      { label: 'Admin Time Saved per Term', value: '240 hours', highlight: false },
    ],
    quote:
      'Before ExamForge AI, running exams across five campuses felt like managing five different schools. Now it feels like one school with five locations. Our academic directors can finally compare performance data apples-to-apples, and parents love the consistent experience regardless of which campus their children attend.',
    quoteAuthor: 'Mr. Chukwuma Eze',
    quoteRole: 'Group Director of Academics, Heritage Academy Group',
    industryTag: 'Multi-Campus School Group',
    implementationTime: '5 weeks',
    roiMetric: '240 hrs',
    roiLabel: 'admin time saved per term',
  },
]

interface UniversitySpotlight {
  name: string
  location: string
  students: string
  established: string
  highlight: string
  description: string
}

const universitySpotlights: UniversitySpotlight[] = [
  {
    name: 'Lagos State University (LASU)',
    location: 'Ojo, Lagos, Nigeria',
    students: '35,000+',
    established: '1983',
    highlight: '₦42M saved per semester',
    description:
      'LASU is one of Nigeria\'s largest state-owned universities, serving over 35,000 students across multiple faculties. After adopting ExamForge AI, the university eliminated paper-based exam distribution, reduced preparation time from three weeks to two days, and achieved 85% grading time savings. The platform\'s multi-campus architecture ensures consistent exam delivery across all halls, and real-time monitoring gives the Vice-Chancellor\'s office unprecedented visibility during examination periods.',
  },
  {
    name: 'Covenant University',
    location: 'Ota, Ogun State, Nigeria',
    students: '10,000+',
    established: '2002',
    highlight: '23% dropout rate reduction',
    description:
      'Covenant University is a leading private university in Nigeria, ranked among the top institutions in West Africa. ExamForge AI\'s predictive analytics module continuously monitors over 40 academic and behavioral signals to identify at-risk students two weeks earlier than traditional methods. The result: a 23% reduction in dropout rate, a 3x increase in advisor interventions, and a 12% improvement in average GPA across the student body.',
  },
  {
    name: 'KNUST',
    location: 'Kumasi, Ghana',
    students: '45,000+',
    established: '1952',
    highlight: 'Seamless cross-faculty CBT delivery',
    description:
      'Kwame Nkrumah University of Science and Technology is Ghana\'s premier science and technology institution, serving over 45,000 students. ExamForge AI\'s deployment at KNUST covers cross-faculty examination delivery with curriculum-aligned question generation matching each department\'s specific standards. The platform handles the university\'s complex multi-session exam schedules across six halls of residence and 12 faculty buildings with zero scheduling conflicts.',
  },
  {
    name: 'University of Cape Coast',
    location: 'Cape Coast, Ghana',
    students: '30,000+',
    established: '1962',
    highlight: '95% auto-marking accuracy',
    description:
      'The University of Cape Coast is one of Ghana\'s leading educational institutions, renowned for its teacher training programs. ExamForge AI\'s AI-assisted auto-marking system achieves 95% accuracy on short-answer questions, reducing lecturers\' grading workload from two weeks to hours per course. The system intelligently flags ambiguous answers for human review, ensuring that the speed gains never come at the cost of grading integrity. The platform now serves over 3,000 students per semester across the Faculty of Education.',
  },
]

interface MinistryPartner {
  name: string
  type: string
  scale: string
  description: string
  keyResult: string
}

const ministryPartners: MinistryPartner[] = [
  {
    name: 'Federal Ministry of Education',
    type: 'National Government Agency',
    scale: '36 states + FCT',
    description:
      'The Federal Ministry of Education uses ExamForge AI to conduct national-level assessments across all 36 states and the Federal Capital Territory. The platform handles 50,000+ concurrent exam sessions with 99.99% uptime, AI-powered proctoring, and centralized result processing that reduced the national results cycle from six weeks to five days. Regional edge servers ensure sub-200ms response times for every student regardless of location.',
    keyResult: '50,000+ concurrent sessions with 99.99% uptime',
  },
  {
    name: 'Rivers State Universal Basic Education Board (SUBEB)',
    type: 'State Government Agency',
    scale: '10,000+ concurrent exam sessions',
    description:
      'Rivers State SUBEB oversees primary education across 200+ examination centres in Port Harcourt and surrounding local government areas. ExamForge AI enables the board to conduct simultaneous CBT assessments for over 10,000 primary school pupils with real-time monitoring and anti-cheating measures. The platform\'s offline-capable terminals ensure that centres in areas with limited connectivity can participate without interruption, and centralized result processing gives the board immediate visibility into performance trends across the state.',
    keyResult: '10,000+ concurrent sessions across 200 centres',
  },
  {
    name: 'Lagos State Ministry of Education',
    type: 'State Government Agency',
    scale: 'State-wide assessment delivery',
    description:
      'The Lagos State Ministry of Education partners with ExamForge AI to deliver state-wide teacher competency assessments and unified promotion examinations across all public secondary schools. The platform processes results for over 250,000 students annually, providing the Ministry with real-time analytics on school performance, subject-level proficiency, and geographic performance disparities. These insights directly inform policy decisions, resource allocation, and targeted intervention programs for underperforming districts.',
    keyResult: '250,000+ student results processed annually',
  },
]

export default function CaseStudiesPage() {
  return (
    <div className="pt-16">
      <OrganizationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Customers', href: '/customers' },
          { name: 'Case Studies', href: '/case-studies' },
        ]}
      />

      {/* ── Hero ── */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            Case Studies
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Real results from{' '}
            <GradientText preset="primary">real institutions</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Discover how schools, universities, and government agencies across Africa have
            transformed their examination operations with ExamForge AI. These are not
            hypothetical scenarios — they are documented outcomes with measurable impact,
            verified by the institutions themselves.
          </p>
        </div>
      </SectionWrapper>

      {/* ── Summary Stats with AnimatedCounter ── */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: 'bar-chart-3', target: 500, suffix: '+', label: 'Schools Onboarded' },
            { icon: 'clock', target: 85, suffix: '%', label: 'Average Time Saved' },
            { icon: 'users', target: 50, suffix: 'K+', label: 'Concurrent Sessions' },
            { icon: 'award', target: 99.99, suffix: '%', label: 'Platform Uptime', formatLocale: false },
          ].map((stat) => {
            const Icon = resolveIcon(stat.icon) ?? Sparkles
            return (
              <div key={stat.label} className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-3">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                  <AnimatedCounter
                    target={stat.target}
                    suffix={stat.suffix}
                    formatLocale={stat.formatLocale ?? true}
                  />
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* ── Case Studies ── */}
      {caseStudies.map((study, i) => {
        const Icon = resolveIcon(study.icon) ?? Sparkles
        return (
          <SectionWrapper
            key={study.institution}
            backgroundClassName={i % 2 === 0 ? '' : 'bg-muted/30 border-y border-border/40'}
          >
            <div className="max-w-5xl mx-auto">
              {/* Institution Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {study.institution}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {study.type} · {study.studentCount}
                  </p>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="flex items-center gap-2 mb-8">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-emerald-200 dark:bg-emerald-950/30 dark:text-green-400 dark:border-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Verified Case Study
                </Badge>
                <span className="text-xs text-muted-foreground">{study.verifiedDate}</span>
              </div>

              {/* Challenge & Solution — Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="bg-card/80 border-border/50 forge-glass-surface rounded-xl forge-card-shadow">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-destructive uppercase tracking-wider">
                      The Challenge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed -mt-2">
                    {study.challenge}
                  </CardContent>
                </Card>
                <Card className="bg-card/80 border-border/50 forge-glass-surface rounded-xl forge-card-shadow">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">
                      The Solution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed -mt-2">
                    {study.solution}
                  </CardContent>
                </Card>
              </div>

              {/* Key Results Grid */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 mb-8">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  Key Results
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {study.results.map((result) => (
                    <div key={result.label} className="text-center p-3">
                      <p
                        className={`text-lg sm:text-xl font-bold tracking-tight ${
                          result.highlight ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {result.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{result.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Quote with Attribution */}
              <div className="rounded-xl border-white/[0.06] bg-card/80 p-6 mb-6">
                <Quote className="h-6 w-6 text-primary/30 mb-3" aria-hidden="true" />
                <blockquote className="text-muted-foreground leading-relaxed italic text-sm sm:text-base">
                  &ldquo;{study.quote}&rdquo;
                </blockquote>
                <Separator className="my-4" />
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold" aria-hidden="true">
                    {study.quoteAuthor.split(' ').filter(n => n.length > 0).map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{study.quoteAuthor}</p>
                    <p className="text-xs text-muted-foreground">{study.quoteRole}</p>
                  </div>
                </div>
              </div>

              {/* Industry Tag, Implementation Time, and ROI */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="gap-1.5">
                  <Globe className="h-3 w-3" aria-hidden="true" />
                  {study.industryTag}
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Implemented in {study.implementationTime}
                </Badge>
                {study.roiMetric && (
                  <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-primary/20">
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    ROI: {study.roiMetric} {study.roiLabel}
                  </Badge>
                )}
              </div>
            </div>
          </SectionWrapper>
        )
      })}

      {/* ── University Spotlights ── */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            University Spotlights
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Trusted by leading{' '}
            <GradientText preset="primary">African universities</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            From Nigeria to Ghana, the continent\'s most prestigious institutions trust ExamForge AI
            to deliver secure, scalable, and AI-powered examination experiences for their students.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {universitySpotlights.map((uni) => (
            <Card key={uni.name} className="bg-card/80 border-border/50 overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate">{uni.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{uni.location}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="-mt-2">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {uni.students} students
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Est. {uni.established}
                  </Badge>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold text-primary">{uni.highlight}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{uni.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Ministry Partnerships ── */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            Ministry Partnerships
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Powering{' '}
            <GradientText preset="warm">government assessment</GradientText>{' '}
            at scale
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Government education agencies at federal and state levels rely on ExamForge AI to
            deliver credible, secure, and scalable assessments that serve millions of students
            across entire regions.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ministryPartners.map((ministry) => (
            <Card key={ministry.name} className="bg-card/80 border-border/50 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Landmark className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold">{ministry.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{ministry.type}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="-mt-2 flex-1">
                <Badge variant="outline" className="mb-3 text-xs gap-1">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  {ministry.scale}
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {ministry.description}
                </p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold text-primary">{ministry.keyResult}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* ── ROI Report Summary ── */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            ROI Report
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            The return on investment is{' '}
            <GradientText preset="primary">measurable</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Across all 500+ institutions, the financial and operational impact of ExamForge AI is
            quantified, tracked, and verified. Here is a summary of the key return-on-investment
            metrics that matter most to education leaders.
          </p>
        </div>

        <Tabs defaultValue="financial" className="max-w-4xl mx-auto">
          <TabsList className="mx-auto mb-8">
            <TabsTrigger value="financial" className="gap-1.5">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Financial Impact
            </TabsTrigger>
            <TabsTrigger value="operational" className="gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Operational Gains
            </TabsTrigger>
            <TabsTrigger value="academic" className="gap-1.5">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Academic Outcomes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financial">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Average Cost Savings per Semester', value: '₦18M', description: 'Schools save an average of ₦18 million per semester through eliminated printing costs, reduced invigilator requirements, and automated grading that replaces manual marking labour.' },
                { label: 'Paper & Printing Eliminated', value: '₦5.2M', description: 'Each institution eliminates an average of ₦5.2 million in annual paper, printing, and secure distribution costs by transitioning to computer-based testing.' },
                { label: 'Payback Period', value: '< 3 months', description: 'The average institution recoups its ExamForge AI investment within three months through direct cost savings alone, before accounting for productivity gains.' },
              ].map((item) => (
                <Card key={item.label} className="bg-card/80 border-border/50 text-center">
                  <CardContent className="pt-6">
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{item.value}</p>
                    <p className="text-sm font-semibold mt-2">{item.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="operational">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Exam Preparation Time', value: '85% ↓', description: 'AI-powered question generation reduces exam preparation from weeks to hours, enabling faculty to generate curriculum-aligned exam papers with Bloom\'s Taxonomy coverage in a single session.' },
                { label: 'Grading Turnaround', value: '2 weeks → hours', description: 'Auto-grading for objective questions delivers instant results, while AI-assisted rubric marking for subjective questions reduces grading turnaround from weeks to hours with 95% accuracy.' },
                { label: 'Result Processing Speed', value: '10x faster', description: 'Automated result compilation, statistical analysis, and report generation replace manual data entry and spreadsheet calculations, delivering results ten times faster than legacy processes.' },
              ].map((item) => (
                <Card key={item.label} className="bg-card/80 border-border/50 text-center">
                  <CardContent className="pt-6">
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{item.value}</p>
                    <p className="text-sm font-semibold mt-2">{item.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="academic">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Student Dropout Reduction', value: '23%', description: 'Predictive analytics identifies at-risk students an average of two weeks earlier than traditional methods, enabling targeted interventions that reduce dropout rates by 23% at partner universities.' },
                { label: 'External Exam Score Improvement', value: '+15%', description: 'Students who practice with ExamForge AI\'s JAMB and WAEC-aligned question banks score an average of 15% higher on external examinations compared to peers without CBT practice experience.' },
                { label: 'Average GPA Improvement', value: '+12%', description: 'Institutions using ExamForge AI\'s adaptive learning recommendations and performance analytics report a 12% improvement in average student GPA within two academic sessions of adoption.' },
              ].map((item) => (
                <Card key={item.label} className="bg-card/80 border-border/50 text-center">
                  <CardContent className="pt-6">
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{item.value}</p>
                    <p className="text-sm font-semibold mt-2">{item.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SectionWrapper>

      {/* ── CTA ── */}
      <CTASection />
    </div>
  )
}
