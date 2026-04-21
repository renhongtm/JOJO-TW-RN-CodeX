import {
  FollowReadConfig,
  FollowReadGroup,
  FollowReadLrcInfo,
  FollowReadSubContent,
} from './types';

type JsonRecord = Record<string, any>;

function safeParseJson<T>(value: string | undefined | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseLrcInfo(input: any): FollowReadLrcInfo {
  return {
    audio: String(input?.audio ?? ''),
    lrc: safeParseJson<Array<[number, number]>>(input?.lrc, []),
    lrcConfig: safeParseJson<string[]>(input?.lrc_config, []),
  };
}

function parseSubContent(input: any): FollowReadSubContent {
  return {
    id: Number(input?.id ?? 0),
    recordTime: Number(input?.record_time ?? 5),
    workType: Number(input?.work_type ?? 1),
    isMatchPhone: Number(input?.isMatchPhone ?? 0) === 1,
    hasSentence: Number(input?.has_sentence ?? 0) === 1,
    titleImagePath: input?.title_image_path ?? null,
    titleVideoEntry: input?.title_video_entry ?? null,
    titleVideoLeave: input?.title_video_leave ?? null,
    titleVideoWeakFeedback: input?.title_video_weak_feedback ?? null,
    titleVideoGeneralFeedback: input?.title_video_general_feedback ?? null,
    titleVideoSuperFeedback: input?.title_video_super_feedback ?? null,
    standardAudio: input?.work_type2?.standard_audio ?? null,
    knowledgeImage: input?.work_type2?.knowledge_points ?? null,
    readInfo: {
      matchTexts: Array.isArray(input?.npc_read_info?.match_text)
        ? input.npc_read_info.match_text.map(String)
        : [],
      matchPhoneText: Array.isArray(input?.npc_read_info?.match_phone_text)
        ? input.npc_read_info.match_phone_text.map(String)
        : [],
      lrcInfos: Array.isArray(input?.npc_read_info?.lrc_info)
        ? input.npc_read_info.lrc_info.map(parseLrcInfo)
        : [],
    },
  };
}

function parseGroups(groups: any[]): FollowReadGroup[] {
  return groups.map(group => ({
    id: Number(group?.id ?? 0),
    subContents: Array.isArray(group?.sub_content)
      ? group.sub_content.map(parseSubContent)
      : [],
  }));
}

function extractQuestionPayload(source: any): JsonRecord {
  if (source?.data?.groups && source?.game_script_name) {
    return source;
  }

  if (typeof source?.questions === 'string') {
    return safeParseJson<JsonRecord>(source.questions, {});
  }

  if (source?.questions?.data?.groups) {
    return source.questions;
  }

  if (typeof source?.content === 'string') {
    const marker = '[题数据：';
    const markerIndex = source.content.indexOf(marker);

    if (markerIndex >= 0) {
      const jsonStart = markerIndex + marker.length;
      const jsonString = source.content.slice(jsonStart).replace(/\]$/, '');
      return safeParseJson<JsonRecord>(jsonString, {});
    }
  }

  return {};
}

export function normalizeFollowReadConfig(source: any): FollowReadConfig {
  const payload = extractQuestionPayload(source);
  const merged: JsonRecord = {
    ...payload,
    step_type: source?.step_type ?? payload?.step_type,
    eventTrackInfo: source?.eventTrackInfo ?? payload?.eventTrackInfo,
  };

  const data = merged?.data ?? {};

  return {
    meta: {
      stepType: Number(merged?.step_type ?? 0),
      stepName: merged?.eventTrackInfo?.stepName ?? undefined,
      lessonName: merged?.eventTrackInfo?.lessonName ?? undefined,
      templateName: merged?.eventTrackInfo?.templateName ?? undefined,
      gameType: Number(merged?.game_type ?? 0),
      gameScriptName: String(merged?.game_script_name ?? ''),
      gameScriptPath: merged?.game_script_path ?? undefined,
      gameCcbName: String(merged?.game_ccb_name ?? ''),
      gameCcbPath: merged?.game_ccb_path ?? undefined,
      animationPrefabName: String(data?.animation_prefab_name ?? ''),
      animationPrefabPath: data?.animation_prefab_path ?? undefined,
      questionText: String(data?.question_text ?? ''),
      questionKey: String(data?.question_key ?? ''),
      isWork: Boolean(data?.isWork ?? false),
    },
    groups: parseGroups(Array.isArray(data?.groups) ? data.groups : []),
  };
}
