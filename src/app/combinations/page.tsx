import type { Metadata } from 'next';
import { pageMetadata, SITE_URL } from '@/lib/seo';
import {
  JAMB_COURSE_COMBINATIONS,
  POPULAR_COURSE_IDS,
  resolveCourseElectives,
} from '@/lib/curriculum/jamb-course-combinations';
import { CombinationsClient } from './combinations-client';

export const metadata: Metadata = {
  ...pageMetadata(
    'JAMB Subject Combination Finder for All Courses (Official IBASS Guide)',
    'Find the official JAMB UTME 4-subject combination, flexible electives, and target cut-off scores for 420+ accredited Nigerian university, polytechnic, and college courses.',
    '/combinations/',
    true
  ),
  keywords: [
    'JAMB subject combination',
    'JAMB subject combination for all courses',
    'UTME subject combination finder',
    'JAMB IBASS brochure',
    'JAMB subject combination for Medicine and Surgery',
    'JAMB subject combination for Computer Science',
    'JAMB subject combination for Nursing',
    'JAMB subject combination for Law',
    'JAMB subject combination for Accounting',
    'JAMB subject combination for Mass Communication',
    'JAMBPrep by LecternIQ',
  ],
};

export default function CombinationsPage() {
  const popularCourses = POPULAR_COURSE_IDS.map((id) =>
    JAMB_COURSE_COMBINATIONS.find((c) => c.id === id)
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: popularCourses.slice(0, 8).map((course) => {
      const resolved = resolveCourseElectives(course);
      return {
        '@type': 'Question',
        name: `What is the JAMB UTME subject combination for ${course.title} in Nigeria?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The official JAMB UTME subject combination for ${course.title} (${course.faculty}) is Use of English, ${resolved.electiveNames.join(', ')}. ${course.ibassNote} Recommended competitive UTME target score: ${course.recommendedTargetScore}+ (${course.competitiveScoreRange}).`,
        },
      };
    }),
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'JAMB UTME Subject Combinations for Accredited Nigerian Courses',
    description:
      'Official JAMB IBASS 4-subject UTME combinations across Medical Sciences, Engineering, Sciences, Law, Social Sciences, Management, Arts, Agriculture, and Education.',
    numberOfItems: JAMB_COURSE_COMBINATIONS.length,
    itemListElement: popularCourses.map((course, idx) => {
      const resolved = resolveCourseElectives(course);
      return {
        '@type': 'ListItem',
        position: idx + 1,
        name: `${course.title} — Use of English, ${resolved.electiveNames.join(', ')}`,
        url: `${SITE_URL}/combinations/#course-${course.id}`,
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <CombinationsClient />
    </>
  );
}
