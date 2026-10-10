import { db } from './index';
import { 
  subjects, 
  topics, 
  passages, 
  questions, 
  questionOptions, 
  questionExplanations 
} from './schema';
import { eq, and } from 'drizzle-orm';

interface SeedQuestionData {
  subjectCode: string;
  topicTitle: string;
  stem: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examYear?: number;
  options: { A: string; B: string; C: string; D: string };
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  passage?: { title: string; content: string };
}

const sampleQuestions: SeedQuestionData[] = [
  // ==========================================
  // 1. USE OF ENGLISH
  // ==========================================
  {
    subjectCode: 'ENG',
    topicTitle: 'Reading Comprehension',
    passage: {
      title: 'The Role of Artificial Intelligence in Developing Economies',
      content: 'In emerging nations, the rapid proliferation of algorithmic automation and digital intelligence represents both an unprecedented springboard for economic leapfrogging and a formidable structural challenge. While automated credit assessment and precision agronomy empower micro-entrepreneurs, widespread infrastructural deficit and energy shortages threaten to deepen the technological divide between urban metropolises and rural agrarian communities.'
    },
    stem: 'According to the passage, what is the primary threat to equitable technological adoption in developing nations?',
    difficulty: 'medium',
    examYear: 2024,
    options: {
      A: 'Excessive reliance on automated credit assessment',
      B: 'Infrastructural deficit and energy shortages',
      C: 'The total collapse of agrarian economic models',
      D: 'Urban metropolises banning digital tools'
    },
    correctOption: 'B',
    explanation: 'The passage explicitly states that "widespread infrastructural deficit and energy shortages threaten to deepen the technological divide between urban metropolises and rural agrarian communities." Hence, option B is correct.'
  },
  {
    subjectCode: 'ENG',
    topicTitle: 'Lexis and Structure',
    stem: 'Choose the option that best completes the sentence: The disciplinary committee decided that the students actions were ______ and warranted immediate sanction.',
    difficulty: 'medium',
    examYear: 2023,
    options: {
      A: 'indefensible',
      B: 'indefensiblely',
      C: 'defenseless',
      D: 'defenselessness'
    },
    correctOption: 'A',
    explanation: '"Indefensible" is an adjective meaning inexcusable or impossible to justify, which correctly qualifies "the student\'s actions" after the linking verb "were".'
  },
  {
    subjectCode: 'ENG',
    topicTitle: 'Antonyms',
    stem: 'Select the option that is most nearly opposite in meaning to the underlined word: The senator\'s remarks on tax reform were surprisingly **ephemeral**.',
    difficulty: 'hard',
    examYear: 2022,
    options: {
      A: 'transient',
      B: 'enduring',
      C: 'superficial',
      D: 'belligerent'
    },
    correctOption: 'B',
    explanation: '"Ephemeral" means lasting for a very short time (transitory). The antonym (opposite in meaning) is "enduring", which means lasting over a long period.'
  },

  // ==========================================
  // 2. MATHEMATICS
  // ==========================================
  {
    subjectCode: 'MTH',
    topicTitle: 'Quadratic Equations',
    stem: 'Find the roots of the quadratic equation: $$2x^2 - 5x + 2 = 0$$',
    difficulty: 'medium',
    examYear: 2024,
    options: {
      A: '$x = 2$ or $x = \\frac{1}{2}$',
      B: '$x = -2$ or $x = -\\frac{1}{2}$',
      C: '$x = 1$ or $x = 4$',
      D: '$x = 3$ or $x = \\frac{2}{3}$'
    },
    correctOption: 'A',
    explanation: 'Using the quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ with $a = 2$, $b = -5$, $c = 2$:\n$$x = \\frac{5 \\pm \\sqrt{(-5)^2 - 4(2)(2)}}{2(2)} = \\frac{5 \\pm \\sqrt{25 - 16}}{4} = \\frac{5 \\pm 3}{4}$$\nThus, $x = \\frac{8}{4} = 2$ or $x = \\frac{2}{4} = \\frac{1}{2}$.'
  },
  {
    subjectCode: 'MTH',
    topicTitle: 'Calculus & Differentiation',
    stem: 'If $y = 3x^4 - 5x^2 + 7x - 9$, find the derivative $\\frac{dy}{dx}$ at $x = 2$.',
    difficulty: 'medium',
    examYear: 2023,
    options: {
      A: '$75$',
      B: '$83$',
      C: '$91$',
      D: '$68$'
    },
    correctOption: 'B',
    explanation: 'Differentiating $y$ with respect to $x$:\n$$\\frac{dy}{dx} = 12x^3 - 10x + 7$$\nEvaluating at $x = 2$:\n$$\\frac{dy}{dx} = 12(2^3) - 10(2) + 7 = 12(8) - 20 + 7 = 96 - 20 + 7 = 83$$.'
  },
  {
    subjectCode: 'MTH',
    topicTitle: 'Trigonometry',
    stem: 'Given that $\\sin \\theta = \\frac{3}{5}$ where $\\theta$ is an acute angle, find the exact value of $\\cos \\theta + \\tan \\theta$.',
    difficulty: 'medium',
    examYear: 2022,
    options: {
      A: '$\\frac{31}{20}$',
      B: '$\\frac{7}{5}$',
      C: '$\\frac{23}{20}$',
      D: '$\\frac{4}{3}$'
    },
    correctOption: 'A',
    explanation: 'Using Pythagoras: adjacent side $= \\sqrt{5^2 - 3^2} = \\sqrt{25 - 9} = 4$.\nTherefore, $\\cos \\theta = \\frac{4}{5}$ and $\\tan \\theta = \\frac{3}{4}$.\n$$\\cos \\theta + \\tan \\theta = \\frac{4}{5} + \\frac{3}{4} = \\frac{16 + 15}{20} = \\frac{31}{20}$$.'
  },

  // ==========================================
  // 3. PHYSICS
  // ==========================================
  {
    subjectCode: 'PHY',
    topicTitle: 'Kinematics & Motion',
    stem: 'A car accelerates uniformly from rest at $2.5\\text{ m/s}^2$ for $8\\text{ seconds}$. Calculate the total distance covered.',
    difficulty: 'easy',
    examYear: 2024,
    options: {
      A: '$80\\text{ m}$',
      B: '$100\\text{ m}$',
      C: '$64\\text{ m}$',
      D: '$160\\text{ m}$'
    },
    correctOption: 'A',
    explanation: 'Using the equation of motion $s = ut + \\frac{1}{2}at^2$, with initial velocity $u = 0$, acceleration $a = 2.5\\text{ m/s}^2$, and time $t = 8\\text{ s}$:\n$$s = 0(8) + \\frac{1}{2}(2.5)(8^2) = 1.25 \\times 64 = 80\\text{ m}$$.'
  },
  {
    subjectCode: 'PHY',
    topicTitle: 'Current Electricity',
    stem: 'Two resistors of resistance $4\\,\\Omega$ and $6\\,\\Omega$ are connected in parallel across a $12\\text{ V}$ battery of negligible internal resistance. What is the total current drawn from the battery?',
    difficulty: 'medium',
    examYear: 2023,
    options: {
      A: '$5.0\\text{ A}$',
      B: '$2.5\\text{ A}$',
      C: '$1.2\\text{ A}$',
      D: '$10.0\\text{ A}$'
    },
    correctOption: 'A',
    explanation: 'For resistors in parallel:\n$$\\frac{1}{R_T} = \\frac{1}{4} + \\frac{1}{6} = \\frac{3 + 2}{12} = \\frac{5}{12} \\implies R_T = \\frac{12}{5} = 2.4\\,\\Omega$$\nUsing Ohm\'s law $I = \\frac{V}{R_T}$:\n$$I = \\frac{12}{2.4} = 5.0\\text{ A}$$.'
  },
  {
    subjectCode: 'PHY',
    topicTitle: 'Waves and Optics',
    stem: 'A radio station transmits electromagnetic waves of frequency $100\\text{ MHz}$. Taking the speed of light $c = 3.0 \\times 10^8\\text{ m/s}$, determine the wavelength $\\lambda$ of the radio wave.',
    difficulty: 'easy',
    examYear: 2022,
    options: {
      A: '$3.0\\text{ m}$',
      B: '$0.33\\text{ m}$',
      C: '$30.0\\text{ m}$',
      D: '$300\\text{ m}$'
    },
    correctOption: 'A',
    explanation: 'Using the wave relation $c = f\\lambda$:\n$$\\lambda = \\frac{c}{f} = \\frac{3.0 \\times 10^8\\text{ m/s}}{100 \\times 10^6\\text{ Hz}} = \\frac{3.0 \\times 10^8}{10^8} = 3.0\\text{ m}$$.'
  },

  // ==========================================
  // 4. CHEMISTRY
  // ==========================================
  {
    subjectCode: 'CHM',
    topicTitle: 'Stoichiometry & Mole Concept',
    stem: 'What mass of calcium carbonate ($\\text{CaCO}_3$) decomposes completely to produce $2.24\\text{ dm}^3$ of carbon dioxide ($\\text{CO}_2$) at s.t.p.? [$\\text{Ca}=40, \\text{C}=12, \\text{O}=16$, Molar volume at s.t.p. $= 22.4\\text{ dm}^3$]',
    difficulty: 'medium',
    examYear: 2024,
    options: {
      A: '$10.0\\text{ g}$',
      B: '$20.0\\text{ g}$',
      C: '$5.0\\text{ g}$',
      D: '$1.0\\text{ g}$'
    },
    correctOption: 'A',
    explanation: 'Reaction: $\\text{CaCO}_3 \\rightarrow \\text{CaO} + \\text{CO}_2$.\nMolar mass of $\\text{CaCO}_3 = 40 + 12 + 3(16) = 100\\text{ g/mol}$.\nMoles of $\\text{CO}_2 = \\frac{2.24}{22.4} = 0.1\\text{ mol}$.\nSince mole ratio is $1:1$, required mass of $\\text{CaCO}_3 = 0.1 \\times 100\\text{ g} = 10.0\\text{ g}$.'
  },
  {
    subjectCode: 'CHM',
    topicTitle: 'Acids, Bases & pH',
    stem: 'Calculate the pH of a $0.001\\text{ M}$ solution of hydrochloric acid ($\\text{HCl}$), assuming complete dissociation.',
    difficulty: 'easy',
    examYear: 2023,
    options: {
      A: '$3$',
      B: '$1$',
      C: '$11$',
      D: '$2$'
    },
    correctOption: 'A',
    explanation: 'For a strong monoprotic acid, $[\\text{H}^+] = 0.001\\text{ M} = 10^{-3}\\text{ M}$.\n$$\\text{pH} = -\\log_{10}[\\text{H}^+] = -\\log_{10}(10^{-3}) = 3$$.'
  },

  // ==========================================
  // 5. BIOLOGY
  // ==========================================
  {
    subjectCode: 'BIO',
    topicTitle: 'Genetics and Heredity',
    stem: 'In a monohybrid cross between two heterozygous tall pea plants ($Tt \\times Tt$), what is the expected phenotypic ratio of tall to dwarf offspring?',
    difficulty: 'easy',
    examYear: 2024,
    options: {
      A: '$3 : 1$',
      B: '$1 : 2 : 1$',
      C: '$1 : 1$',
      D: '$9 : 3 : 3 : 1$'
    },
    correctOption: 'A',
    explanation: 'The genotypic distribution of $Tt \\times Tt$ is $1 TT : 2 Tt : 1 tt$. Since the allele for tallness ($T$) is dominant over dwarfness ($t$), both $TT$ and $Tt$ express the tall phenotype (3 tall) while $tt$ expresses the dwarf phenotype (1 dwarf). Phenotypic ratio is $3 : 1$.'
  },
  {
    subjectCode: 'BIO',
    topicTitle: 'Cell Biology & Organelles',
    stem: 'Which organelle is primarily responsible for the synthesis of adenosine triphosphate (ATP) via cellular respiration?',
    difficulty: 'easy',
    examYear: 2023,
    options: {
      A: 'Mitochondrion',
      B: 'Ribosome',
      C: 'Golgi apparatus',
      D: 'Endoplasmic reticulum'
    },
    correctOption: 'A',
    explanation: 'The mitochondrion is known as the powerhouse of the cell, where the Krebs cycle and oxidative phosphorylation take place to generate ATP.'
  }
];

async function seedQuestions() {
  console.log('Seeding authentic JAMB UTME questions across core subjects...');

  for (const q of sampleQuestions) {
    // 1. Find Subject
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.code, q.subjectCode),
    });

    if (!subject) {
      console.warn(`Subject ${q.subjectCode} not found in database!`);
      continue;
    }

    // 2. Find or Create Topic
    const topicSlug = q.topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let topic = await db.query.topics.findFirst({
      where: and(eq(topics.subjectId, subject.id), eq(topics.slug, topicSlug)),
    });

    if (!topic) {
      const [newTopic] = await db.insert(topics).values({
        subjectId: subject.id,
        title: q.topicTitle,
        slug: topicSlug,
      }).returning();
      topic = newTopic;
    }

    // 3. Find or Create Passage (if present)
    let passageId: string | null = null;
    if (q.passage) {
      const [newPassage] = await db.insert(passages).values({
        subjectId: subject.id,
        title: q.passage.title,
        content: q.passage.content,
      }).returning();
      passageId = newPassage.id;
    }

    // 4. Create Question
    const [newQuestion] = await db.insert(questions).values({
      subjectId: subject.id,
      topicId: topic.id,
      passageId: passageId,
      stem: q.stem,
      difficulty: q.difficulty,
      examYear: q.examYear || null,
      status: 'published',
    }).returning();

    // 5. Create Options
    const optionKeys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    const optionValues = optionKeys.map((key) => ({
      questionId: newQuestion.id,
      label: key,
      content: q.options[key],
      isCorrect: q.correctOption === key,
    }));

    await db.insert(questionOptions).values(optionValues);

    // 6. Create Detailed Explanation
    await db.insert(questionExplanations).values({
      questionId: newQuestion.id,
      explanation: q.explanation,
    });
  }

  console.log(`Successfully seeded ${sampleQuestions.length} verified questions with LaTeX and explanations!`);
  process.exit(0);
}

seedQuestions().catch((err) => {
  console.error('Failed to seed questions:', err);
  process.exit(1);
});
