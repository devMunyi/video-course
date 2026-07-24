// Deterministic data the suite asserts against. Kept in one place so a spec and
// the seed can never drift apart.

export const TEST_USER = {
  id: "e2e-user-0000000000000001",
  email: "student@videocourse.test",
  name: "E2E Student",
}

export const TEST_COURSE_ID = "e2e-course-000000000000001"
export const TEST_VIDEO_ID = "dQw4w9WgXcQ" // any id; the player is never driven in tests

// A minimal but schema-valid course: 3 milestones so prev/next disabled-states
// at both ends and a middle section are all reachable. Titles are distinctive so
// specs can match on them.
export const TEST_COURSE_CONTENT = {
  title: "E2E Price Action Course",
  description: "Fixture course for study-mode e2e.",
  topic: "Trading",
  summary: "A three-section fixture.",
  milestones: [
    {
      id: "ms-1",
      title: "Section One: Market Structure",
      timestamp_start: "00:00",
      timestamp_end: "02:00",
      description: "First section description.",
      key_concepts: ["Support levels", "Resistance levels"],
      active_recall: [
        { id: "ar-1", question: "What is support?", hint: "floor", sample_answer: "A price floor." },
      ],
      quiz: [
        {
          id: "q-1",
          question: "Support is…",
          options: [
            { id: "q-1-a", text: "A floor", is_correct: true },
            { id: "q-1-b", text: "A ceiling", is_correct: false },
            { id: "q-1-c", text: "A trend", is_correct: false },
            { id: "q-1-d", text: "A wick", is_correct: false },
          ],
          explanation: "Support acts as a floor.",
        },
      ],
    },
    {
      id: "ms-2",
      title: "Section Two: Supply and Demand",
      timestamp_start: "02:00",
      timestamp_end: "04:00",
      description: "Second section description.",
      key_concepts: ["Supply zones", "Demand zones"],
      active_recall: [
        { id: "ar-2", question: "What is a supply zone?", hint: "sellers", sample_answer: "Where sellers dominate." },
      ],
      quiz: [
        {
          id: "q-2",
          question: "A supply zone is where…",
          options: [
            { id: "q-2-a", text: "Sellers dominate", is_correct: true },
            { id: "q-2-b", text: "Buyers dominate", is_correct: false },
            { id: "q-2-c", text: "Nothing happens", is_correct: false },
            { id: "q-2-d", text: "Price gaps", is_correct: false },
          ],
          explanation: "Supply = sellers.",
        },
      ],
    },
    {
      id: "ms-3",
      title: "Section Three: Trend Identification",
      timestamp_start: "04:00",
      timestamp_end: "06:00",
      description: "Third section description.",
      key_concepts: ["Higher highs", "Lower lows"],
      active_recall: [
        { id: "ar-3", question: "What defines an uptrend?", hint: "highs", sample_answer: "Higher highs and higher lows." },
      ],
      quiz: [
        {
          id: "q-3",
          question: "An uptrend has…",
          options: [
            { id: "q-3-a", text: "Higher highs", is_correct: true },
            { id: "q-3-b", text: "Lower highs", is_correct: false },
            { id: "q-3-c", text: "Flat highs", is_correct: false },
            { id: "q-3-d", text: "No highs", is_correct: false },
          ],
          explanation: "Uptrend = higher highs.",
        },
      ],
    },
  ],
}

// Fixed session token; the seed signs it into a cookie and Playwright loads it as
// storageState, so specs start already authenticated (auth is Google-only, so the
// login form itself cannot be driven).
export const TEST_SESSION_TOKEN = "e2e-session-token-fixed-for-tests-000001"
