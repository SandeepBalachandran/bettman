/**
 * Adds Indian Super League trivia to the daily quiz pool. Skips any question
 * that already exists, so it's safe to re-run.
 *
 *   npx tsx --env-file=.env scripts/add-isl-quiz-questions.ts
 */
import { prisma } from "../lib/prisma";
import { QuizDifficulty } from "@prisma/client";

const { EASY, MEDIUM, HARD } = QuizDifficulty;

const islQuestions: Array<{
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: QuizDifficulty;
}> = [
  // EASY
  {
    question: "In which year was the first Indian Super League season played?",
    options: ["2012", "2014", "2016", "2017"],
    correctIndex: 1,
    difficulty: EASY,
  },
  {
    question: "Which city is Kerala Blasters FC based in?",
    options: ["Kozhikode", "Thiruvananthapuram", "Kochi", "Thrissur"],
    correctIndex: 2,
    difficulty: EASY,
  },
  {
    question: "Sunil Chhetri has captained which ISL club?",
    options: ["Mumbai City FC", "Bengaluru FC", "Chennaiyin FC", "FC Goa"],
    correctIndex: 1,
    difficulty: EASY,
  },
  {
    question: "Which ISL club is nicknamed 'The Islanders'?",
    options: ["Mumbai City FC", "FC Goa", "Odisha FC", "NorthEast United FC"],
    correctIndex: 0,
    difficulty: EASY,
  },
  {
    question: "Which Kolkata giant joined the ISL ahead of the 2020–21 season?",
    options: ["Mohammedan SC", "Aryan FC", "Bhawanipore FC", "East Bengal"],
    correctIndex: 3,
    difficulty: EASY,
  },
  {
    question: "Which team won the very first ISL title in 2014?",
    options: ["Atlético de Kolkata (ATK)", "Kerala Blasters", "FC Goa", "Chennaiyin FC"],
    correctIndex: 0,
    difficulty: EASY,
  },
  {
    question: "Kerala Blasters' famous fan group is known as…",
    options: ["West Block Blues", "Manjappada", "Marina Machans", "Gaur Army"],
    correctIndex: 1,
    difficulty: EASY,
  },
  {
    question: "Which ISL club represents Chennai?",
    options: ["Chennai City FC", "Chennaiyin FC", "Tamil Nadu United", "Chennai Titans"],
    correctIndex: 1,
    difficulty: EASY,
  },

  // MEDIUM
  {
    question: "Which team did ATK beat in the first ISL final in 2014?",
    options: ["FC Goa", "Chennaiyin FC", "Kerala Blasters", "Mumbai City FC"],
    correctIndex: 2,
    difficulty: MEDIUM,
  },
  {
    question: "Which club won the ISL title in both 2015 and 2017–18?",
    options: ["Chennaiyin FC", "Bengaluru FC", "ATK", "FC Goa"],
    correctIndex: 0,
    difficulty: MEDIUM,
  },
  {
    question: "In which season did Bengaluru FC win their first ISL title?",
    options: ["2016", "2017–18", "2018–19", "2020–21"],
    correctIndex: 2,
    difficulty: MEDIUM,
  },
  {
    question: "Which club won the ISL in 2021–22, beating Kerala Blasters on penalties in the final?",
    options: ["Jamshedpur FC", "Hyderabad FC", "ATK Mohun Bagan", "Mumbai City FC"],
    correctIndex: 1,
    difficulty: MEDIUM,
  },
  {
    question: "Which club won the ISL title in 2020–21?",
    options: ["ATK Mohun Bagan", "FC Goa", "Mumbai City FC", "NorthEast United FC"],
    correctIndex: 2,
    difficulty: MEDIUM,
  },
  {
    question: "Bengaluru FC's famous supporters' group is called…",
    options: ["West Block Blues", "Highlanders Army", "Manjappada", "Kop Kolkata"],
    correctIndex: 0,
    difficulty: MEDIUM,
  },
  {
    question: "What is the name of Bengaluru FC's home stadium?",
    options: ["Chinnaswamy Stadium", "Sree Kanteerava Stadium", "Bangalore Football Stadium", "Jawaharlal Nehru Stadium"],
    correctIndex: 1,
    difficulty: MEDIUM,
  },
  {
    question: "Odisha FC was previously known by which name?",
    options: ["Pune City FC", "Delhi Dynamos FC", "Kolkata Knights FC", "Hyderabad FC"],
    correctIndex: 1,
    difficulty: MEDIUM,
  },
  {
    question: "Chennaiyin FC's nickname is…",
    options: ["The Gaurs", "The Highlanders", "Marina Machans", "The Blues"],
    correctIndex: 2,
    difficulty: MEDIUM,
  },
  {
    question: "NorthEast United FC is based in which city?",
    options: ["Shillong", "Imphal", "Aizawl", "Guwahati"],
    correctIndex: 3,
    difficulty: MEDIUM,
  },

  // HARD
  {
    question: "How many ISL finals did Kerala Blasters lose in 2014, 2016 and 2021–22 combined?",
    options: ["1", "2", "3", "0"],
    correctIndex: 2,
    difficulty: HARD,
  },
  {
    question: "Which club won the first ISL League Winners' Shield, in 2019–20?",
    options: ["ATK", "FC Goa", "Bengaluru FC", "Chennaiyin FC"],
    correctIndex: 1,
    difficulty: HARD,
  },
  {
    question: "Which club won the 2022–23 ISL final against Bengaluru FC on penalties?",
    options: ["Mumbai City FC", "Hyderabad FC", "ATK Mohun Bagan", "Odisha FC"],
    correctIndex: 2,
    difficulty: HARD,
  },
  {
    question: "Which team did Mumbai City FC beat in the 2023–24 ISL final?",
    options: ["Mohun Bagan Super Giant", "Odisha FC", "FC Goa", "Kerala Blasters"],
    correctIndex: 0,
    difficulty: HARD,
  },
  {
    question: "ATK won the ISL title in 2014 and in which other season?",
    options: ["2015", "2016", "2017–18", "2019–20"],
    correctIndex: 1,
    difficulty: HARD,
  },
  {
    question: "Which global football group holds a majority stake in Mumbai City FC?",
    options: ["Red Bull GmbH", "City Football Group", "Fenway Sports Group", "Eagle Football Group"],
    correctIndex: 1,
    difficulty: HARD,
  },
];

async function addIslQuestions() {
  try {
    let added = 0;
    for (const question of islQuestions) {
      const exists = await prisma.quizQuestion.findFirst({
        where: { question: question.question },
      });

      if (!exists) {
        await prisma.quizQuestion.create({ data: question });
        added++;
        console.log(`✓ Added: ${question.question}`);
      } else {
        console.log(`⊘ Already exists: ${question.question}`);
      }
    }

    console.log(`\n✅ Added ${added} ISL question(s).`);
    console.log(`Total active questions: ${await prisma.quizQuestion.count({ where: { active: true } })}`);
  } catch (error) {
    console.error("Error adding questions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addIslQuestions();
