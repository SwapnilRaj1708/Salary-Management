import type { CountryCode } from '@salary/shared';
import type { Department, JobTitle } from '../db/reference.ts';
import type { IsoDate } from '../domain/dates.ts';

/** The PRNG seed and the date the seeded organisation is "as of". Fixed, so every run matches. */
export const SEED = 20_261_001;
export const SEED_AS_OF: IsoDate = '2026-10-01';
export const COMPANY_FOUNDED: IsoDate = '2012-01-02';
export const HEADCOUNT = 10_000;
export const EMAIL_DOMAIN = 'acme.example';

type CountryProfile = {
  /** Employees in this country when the seed creates 10,000. */
  headcount: number;
  /** Typical annual pay in whole local units for a pay multiplier of 1 (a Software Engineer). */
  salaryAnchor: number;
  /** Seeded amounts are rounded to this many whole local units. */
  roundTo: number;
  firstNames: readonly string[];
  lastNames: readonly string[];
};

/**
 * Salaries are made up in local currency, so the seed never converts currencies (decision
 * X1). The anchors are rough market figures for illustration, not real pay data.
 */
// biome-ignore format: the name lists read better packed than one name per line
export const COUNTRY_PROFILES: Record<CountryCode, CountryProfile> = {
  US: {
    headcount: 2400,
    salaryAnchor: 120_000,
    roundTo: 100,
    firstNames: [
      'James', 'Mary', 'Michael', 'Patricia', 'Robert', 'Jennifer', 'David', 'Linda', 'William',
      'Elizabeth', 'Daniel', 'Sarah', 'Joseph', 'Jessica', 'Christopher', 'Emily', 'Matthew',
      'Ashley', 'Anthony', 'Olivia',
    ],
    lastNames: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
      'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
      'Jackson', 'Martin', 'Lee',
    ],
  },
  IN: {
    headcount: 2000,
    salaryAnchor: 1_800_000,
    roundTo: 1000,
    firstNames: [
      'Aarav', 'Ananya', 'Vivaan', 'Diya', 'Aditya', 'Isha', 'Arjun', 'Priya', 'Rohan', 'Kavya',
      'Sai', 'Anika', 'Krishna', 'Meera', 'Ishaan', 'Pooja', 'Rahul', 'Neha', 'Karan', 'Sneha',
    ],
    lastNames: [
      'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Reddy', 'Iyer', 'Nair', 'Rao',
      'Mehta', 'Joshi', 'Desai', 'Bhat', 'Kapoor', 'Chopra', 'Malhotra', 'Banerjee', 'Das',
      'Pillai',
    ],
  },
  GB: {
    headcount: 1100,
    salaryAnchor: 62_000,
    roundTo: 100,
    firstNames: [
      'Oliver', 'Amelia', 'George', 'Isla', 'Harry', 'Ava', 'Jack', 'Mia', 'Noah', 'Grace',
      'Charlie', 'Freya', 'Thomas', 'Lily', 'Oscar', 'Sophie', 'William', 'Evie', 'Henry', 'Poppy',
    ],
    lastNames: [
      'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Patel',
      'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall',
      'Wood', 'Clarke',
    ],
  },
  DE: {
    headcount: 1000,
    salaryAnchor: 68_000,
    roundTo: 100,
    firstNames: [
      'Lukas', 'Mia', 'Leon', 'Emma', 'Finn', 'Hannah', 'Jonas', 'Sophie', 'Paul', 'Lena',
      'Felix', 'Marie', 'Maximilian', 'Lea', 'Elias', 'Anna', 'Noah', 'Laura', 'Jan', 'Jana',
    ],
    lastNames: [
      'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz',
      'Hoffmann', 'Koch', 'Richter', 'Bauer', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz',
      'Zimmermann', 'Braun',
    ],
  },
  CA: {
    headcount: 800,
    salaryAnchor: 100_000,
    roundTo: 100,
    firstNames: [
      'Liam', 'Olivia', 'Noah', 'Emma', 'William', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas',
      'Ava', 'Ethan', 'Sophia', 'Jacob', 'Chloé', 'Mathis', 'Léa', 'Logan', 'Maya', 'Owen', 'Zoé',
    ],
    lastNames: [
      'Smith', 'Brown', 'Tremblay', 'Martin', 'Roy', 'Wilson', 'Gagnon', 'Johnson', 'MacDonald',
      'Taylor', 'Côté', 'Campbell', 'Anderson', 'Bouchard', 'Lee', 'Leblanc', 'Gauthier', 'Morin',
      'Thompson', 'White',
    ],
  },
  BR: {
    headcount: 700,
    salaryAnchor: 150_000,
    roundTo: 100,
    firstNames: [
      'Miguel', 'Helena', 'Arthur', 'Alice', 'Gael', 'Laura', 'Heitor', 'Manuela', 'Théo',
      'Valentina', 'Davi', 'Sophia', 'Gabriel', 'Isabella', 'Bernardo', 'Júlia', 'Samuel', 'Lívia',
      'João', 'Beatriz',
    ],
    lastNames: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima',
      'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares',
      'Fernandes', 'Vieira', 'Barbosa',
    ],
  },
  AU: {
    headcount: 600,
    salaryAnchor: 120_000,
    roundTo: 100,
    firstNames: [
      'Oliver', 'Charlotte', 'Jack', 'Olivia', 'William', 'Amelia', 'Noah', 'Isla', 'Thomas', 'Mia',
      'Lachlan', 'Ava', 'Cooper', 'Grace', 'Henry', 'Chloe', 'Lucas', 'Matilda', 'Max', 'Zoe',
    ],
    lastNames: [
      'Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Nguyen', 'Johnson', 'Martin',
      'White', 'Anderson', 'Walker', 'Thompson', 'Thomas', 'Ryan', 'Harris', 'Lee', 'Kelly', 'King',
      'Campbell',
    ],
  },
  JP: {
    headcount: 600,
    salaryAnchor: 7_000_000,
    roundTo: 10_000,
    firstNames: [
      'Haruto', 'Yui', 'Sota', 'Hina', 'Yuto', 'Sakura', 'Riku', 'Aoi', 'Ren', 'Mei', 'Kaito',
      'Yuna', 'Hayato', 'Rin', 'Takumi', 'Akari', 'Daiki', 'Saki', 'Kenta', 'Mio',
    ],
    lastNames: [
      'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura',
      'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue',
      'Kimura', 'Hayashi', 'Shimizu', 'Mori',
    ],
  },
  SG: {
    headcount: 500,
    salaryAnchor: 95_000,
    roundTo: 100,
    firstNames: [
      'Wei Ling', 'Jun Jie', 'Hui Min', 'Wei Jie', 'Xin Yi', 'Zhi Hao', 'Siti', 'Muhammad', 'Priya',
      'Rajesh', 'Mei Ling', 'Kai Wen', 'Nur', 'Arjun', 'Jia Hui', 'Darren', 'Rachel', 'Marcus',
      'Shu Fen', 'Ethan',
    ],
    lastNames: [
      'Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Wong', 'Goh', 'Chua', 'Chan', 'Koh', 'Teo', 'Ang', 'Yeo',
      'Tay', 'Ho', 'Low', 'Abdullah', 'Rahman', 'Kumar', 'Pillai',
    ],
  },
  KW: {
    headcount: 300,
    salaryAnchor: 18_000,
    roundTo: 10,
    firstNames: [
      'Mohammed', 'Fatima', 'Abdullah', 'Noor', 'Ahmad', 'Maryam', 'Ali', 'Sara', 'Yousef', 'Aisha',
      'Khalid', 'Dana', 'Hamad', 'Hessa', 'Faisal', 'Lulwa', 'Omar', 'Shaikha', 'Salem', 'Reem',
    ],
    lastNames: [
      'Al-Sabah', 'Al-Mutairi', 'Al-Ajmi', 'Al-Enezi', 'Al-Rashidi', 'Al-Shammari', 'Al-Azmi',
      'Al-Harbi', 'Al-Otaibi', 'Al-Kandari', 'Al-Fadhli', 'Al-Hajri', 'Al-Dosari', 'Al-Sharhan',
      'Al-Ghanim', 'Al-Saleh', 'Al-Bahar', 'Al-Qattan', 'Al-Roumi', 'Behbehani',
    ],
  },
};

/** How common each department is, and its titles with their relative headcount. */
export const DEPARTMENT_PROFILES: Record<
  Department,
  { weight: number; titles: Partial<Record<JobTitle, number>> }
> = {
  Engineering: {
    weight: 35,
    titles: {
      'Junior Software Engineer': 15,
      'Software Engineer': 35,
      'Senior Software Engineer': 25,
      'Staff Engineer': 6,
      'Engineering Manager': 7,
      'QA Engineer': 6,
      'DevOps Engineer': 6,
    },
  },
  Product: { weight: 6, titles: { 'Product Manager': 70, 'Senior Product Manager': 30 } },
  Design: { weight: 5, titles: { 'Product Designer': 70, 'Senior Product Designer': 30 } },
  Data: { weight: 7, titles: { 'Data Analyst': 40, 'Data Scientist': 30, 'Data Engineer': 30 } },
  Sales: {
    weight: 15,
    titles: {
      'Sales Development Representative': 40,
      'Account Executive': 45,
      'Sales Manager': 15,
    },
  },
  Marketing: { weight: 7, titles: { 'Marketing Specialist': 70, 'Marketing Manager': 30 } },
  'Customer Success': {
    weight: 10,
    titles: { 'Support Specialist': 65, 'Customer Success Manager': 35 },
  },
  Finance: {
    weight: 5,
    titles: { Accountant: 45, 'Financial Analyst': 35, 'Finance Manager': 20 },
  },
  People: { weight: 4, titles: { 'HR Generalist': 40, Recruiter: 35, 'People Partner': 25 } },
  Operations: {
    weight: 6,
    titles: { 'Operations Coordinator': 45, 'Office Manager': 25, 'Operations Manager': 30 },
  },
};

/** Pay relative to a Software Engineer in the same country. */
export const TITLE_PAY: Record<JobTitle, number> = {
  'Junior Software Engineer': 0.7,
  'Software Engineer': 1,
  'Senior Software Engineer': 1.35,
  'Staff Engineer': 1.7,
  'Engineering Manager': 1.75,
  'QA Engineer': 0.85,
  'DevOps Engineer': 1.05,
  'Product Manager': 1.15,
  'Senior Product Manager': 1.45,
  'Product Designer': 0.95,
  'Senior Product Designer': 1.25,
  'Data Analyst': 0.8,
  'Data Scientist': 1.15,
  'Data Engineer': 1.05,
  'Sales Development Representative': 0.55,
  'Account Executive': 0.9,
  'Sales Manager': 1.3,
  'Marketing Specialist': 0.7,
  'Marketing Manager': 1.1,
  'Support Specialist': 0.5,
  'Customer Success Manager': 0.8,
  Accountant: 0.7,
  'Financial Analyst': 0.85,
  'Finance Manager': 1.2,
  'HR Generalist': 0.65,
  Recruiter: 0.7,
  'People Partner': 0.95,
  'Operations Coordinator': 0.5,
  'Office Manager': 0.55,
  'Operations Manager': 0.95,
};
