// Manipuri (Meitei). NOT actually translated — deliberately mirrors English.
//
// I don't have reliable training data for Meitei (in either Bengali script
// or Meitei Mayek), and this app collects clinical symptom data — a
// confidently-wrong medical translation is worse than an honest English
// fallback, which at least doesn't pretend to be validated. This file
// exists so Manipuri is already selectable in the language switcher and
// wired end-to-end (including `questionnaire_responses.language_used`),
// but every value below needs a native-speaking clinician or translator to
// actually fill in before this is real. Until then, Manipuri-selecting
// users just see English.
import type { MessageKey } from './en';
import { en } from './en';

export const mni: Record<MessageKey, string> = { ...en };
