// src/services/bibleService.ts
import axios from 'axios';

// API gratuita: https://scripture.api.bible
// Crie uma chave gratuita em https://scripture.api.bible/signup
const API_KEY = process.env.EXPO_PUBLIC_BIBLE_API_KEY ?? 'SUA_CHAVE_AQUI';
const BASE_URL = 'https://api.scripture.api.bible/v1';

// IDs das traduções em português na API
export const BIBLE_TRANSLATIONS = {
  NVI: '37a78cc8e4fc0e2c-01', // Nova Versão Internacional
  ARC: '55ec6bce4f50b9d4-01', // Almeida Revista e Corrigida
  ARA: 'a556b2b2a906b8a3-01', // Almeida Revista e Atualizada
  NTLH: 'b32b9d1b64b4ef29-01', // Nova Tradução na Linguagem de Hoje
} as const;

export type TranslationKey = keyof typeof BIBLE_TRANSLATIONS;

// Versículos de fallback para modo offline
export const FALLBACK_VERSES = [
  {
    reference: 'Filipenses 4:13',
    text: 'Tudo posso naquele que me fortalece.',
    book: 'PHP',
  },
  {
    reference: '2 Timóteo 1:7',
    text: 'Porque Deus não nos deu o espírito de temor, mas de poder, de amor e de moderação.',
    book: '2TI',
  },
  {
    reference: 'Salmos 23:1',
    text: 'O Senhor é o meu pastor; nada me faltará.',
    book: 'PSA',
  },
  {
    reference: 'João 3:16',
    text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    book: 'JHN',
  },
  {
    reference: 'Jeremias 29:11',
    text: 'Porque eu sei os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.',
    book: 'JER',
  },
  {
    reference: 'Provérbios 3:5',
    text: 'Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.',
    book: 'PRO',
  },
  {
    reference: 'Romanos 8:28',
    text: 'Sabemos que Deus age em todas as coisas para o bem daqueles que o amam, dos que foram chamados de acordo com o seu propósito.',
    book: 'ROM',
  },
  {
    reference: 'Isaías 41:10',
    text: 'Não tema, pois estou com você; não se apavore, pois sou o seu Deus. Eu o fortalecerei e o ajudarei; eu o sustentarei com minha mão direita vitoriosa.',
    book: 'ISA',
  },
  {
    reference: 'Mateus 6:33',
    text: 'Busquem, pois, em primeiro lugar o reino de Deus e a sua justiça, e todas essas coisas lhes serão acrescentadas.',
    book: 'MAT',
  },
  {
    reference: 'Salmos 46:1',
    text: 'Deus é o nosso refúgio e a nossa força, socorro bem presente na angústia.',
    book: 'PSA',
  },
];

export interface Verse {
  reference: string;
  text: string;
  translation?: string;
}

const bibleApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'api-key': API_KEY,
  },
  timeout: 8000,
});

export async function getVerseOfDay(
  translation: TranslationKey = 'NVI'
): Promise<Verse> {
  // Seleciona versículo do dia baseado na data (determinístico)
  const dayOfYear = getDayOfYear(new Date());
  const fallback = FALLBACK_VERSES[dayOfYear % FALLBACK_VERSES.length];

  try {
    const bibleId = BIBLE_TRANSLATIONS[translation];
    const verseId = getVerseIdForDay(dayOfYear);

    const response = await bibleApi.get(`/bibles/${bibleId}/verses/${verseId}`, {
      params: { 'content-type': 'text', 'include-verse-numbers': false },
    });

    const data = response.data.data;
    return {
      reference: data.reference,
      text: cleanVerseText(data.content),
      translation,
    };
  } catch {
    // Modo offline: retorna versículo local
    return {
      reference: fallback.reference,
      text: fallback.text,
      translation,
    };
  }
}

export async function getRandomVerse(
  translation: TranslationKey = 'NVI'
): Promise<Verse> {
  const randomIndex = Math.floor(Math.random() * FALLBACK_VERSES.length);
  return {
    reference: FALLBACK_VERSES[randomIndex].reference,
    text: FALLBACK_VERSES[randomIndex].text,
    translation,
  };
}

// Versículos populares para o dia — roda entre os da lista
const DAILY_VERSE_IDS = [
  'PHP.4.13', 'JHN.3.16', 'PSA.23.1', '2TI.1.7',
  'JER.29.11', 'PRO.3.5', 'ROM.8.28', 'ISA.41.10',
  'MAT.6.33', 'PSA.46.1',
];

function getVerseIdForDay(dayOfYear: number): string {
  return DAILY_VERSE_IDS[dayOfYear % DAILY_VERSE_IDS.length];
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function cleanVerseText(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
