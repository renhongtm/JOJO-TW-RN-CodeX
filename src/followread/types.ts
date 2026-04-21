export type FollowReadPhase =
  | 'ready'
  | 'npc1'
  | 'npc2'
  | 'record'
  | 'feedback';

export interface FollowReadLrcInfo {
  audio: string;
  lrc: Array<[number, number]>;
  lrcConfig: string[];
}

export interface FollowReadReadInfo {
  matchTexts: string[];
  matchPhoneText: string[];
  lrcInfos: FollowReadLrcInfo[];
}

export interface FollowReadSubContent {
  id: number;
  recordTime: number;
  workType: number;
  isMatchPhone: boolean;
  hasSentence: boolean;
  titleImagePath?: string | null;
  titleVideoEntry?: string | null;
  titleVideoLeave?: string | null;
  titleVideoWeakFeedback?: string | null;
  titleVideoGeneralFeedback?: string | null;
  titleVideoSuperFeedback?: string | null;
  standardAudio?: string | null;
  knowledgeImage?: string | null;
  readInfo: FollowReadReadInfo;
}

export interface FollowReadGroup {
  id: number;
  subContents: FollowReadSubContent[];
}

export interface FollowReadTemplateMeta {
  stepType?: number;
  stepName?: string;
  lessonName?: string;
  templateName?: string;
  gameType: number;
  gameScriptName: string;
  gameScriptPath?: string;
  gameCcbName: string;
  gameCcbPath?: string;
  animationPrefabName: string;
  animationPrefabPath?: string;
  questionText: string;
  questionKey: string;
  isWork: boolean;
}

export interface FollowReadConfig {
  meta: FollowReadTemplateMeta;
  groups: FollowReadGroup[];
}
