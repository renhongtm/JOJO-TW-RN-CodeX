import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FollowReadConfig, FollowReadPhase } from '../types';
import { SpineWebPlayer } from '../spine/SpineWebPlayer';

interface FollowReadWordTemplateProps {
  config: FollowReadConfig;
}

const phaseOrder: FollowReadPhase[] = ['ready', 'npc1', 'npc2', 'record', 'feedback'];

function phaseLabel(phase: FollowReadPhase): string {
  switch (phase) {
    case 'ready':
      return '准备';
    case 'npc1':
      return 'NPC1 领读';
    case 'npc2':
      return 'NPC2 领读';
    case 'record':
      return '用户录音';
    case 'feedback':
      return '反馈';
    default:
      return phase;
  }
}

export function FollowReadWordTemplate({
  config,
}: FollowReadWordTemplateProps) {
  const [groupIndex, setGroupIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [phase, setPhase] = useState<FollowReadPhase>('ready');
  const [countdown, setCountdown] = useState<number | null>(null);

  const currentGroup = config.groups[groupIndex];
  const currentSub = currentGroup?.subContents[subIndex];

  useEffect(() => {
    if (phase !== 'record' || !currentSub) {
      setCountdown(null);
      return;
    }

    setCountdown(currentSub.recordTime);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setPhase('feedback');
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, currentSub]);

  const totalSubCount = useMemo(
    () => config.groups.reduce((sum, group) => sum + group.subContents.length, 0),
    [config.groups],
  );

  const completedSubCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < groupIndex; i += 1) {
      count += config.groups[i].subContents.length;
    }
    count += subIndex;
    return count;
  }, [config.groups, groupIndex, subIndex]);

  const npc1Audio = currentSub?.readInfo.lrcInfos[0]?.audio ?? '-';
  const npc2Audio = currentSub?.readInfo.lrcInfos[1]?.audio ?? '-';

  const goToNextPhase = () => {
    const currentPhaseIndex = phaseOrder.indexOf(phase);
    const nextPhase = phaseOrder[Math.min(currentPhaseIndex + 1, phaseOrder.length - 1)];
    setPhase(nextPhase);
  };

  const goToPrevStep = () => {
    if (subIndex > 0) {
      setSubIndex(subIndex - 1);
      setPhase('ready');
      return;
    }

    if (groupIndex > 0) {
      const prevGroupIndex = groupIndex - 1;
      setGroupIndex(prevGroupIndex);
      setSubIndex(Math.max(config.groups[prevGroupIndex].subContents.length - 1, 0));
      setPhase('ready');
    }
  };

  const goToNextStep = () => {
    if (!currentGroup) {
      return;
    }

    if (subIndex < currentGroup.subContents.length - 1) {
      setSubIndex(subIndex + 1);
      setPhase('ready');
      return;
    }

    if (groupIndex < config.groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setSubIndex(0);
      setPhase('ready');
    }
  };

  if (!currentSub) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>没有可展示的 followread 数据</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>React Native Template Host</Text>
          <Text style={styles.heroTitle}>{config.meta.stepName ?? '跟读挑战'}</Text>
          <Text style={styles.heroSubtitle}>
            {config.meta.gameScriptName} · {config.meta.gameCcbName}
          </Text>
          <Text style={styles.heroBody}>
            这版先保留原始题目配置驱动方式，把模板运行时、题目推进和调试面板跑通。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>模板元信息</Text>
          <InfoRow label="题型" value={`${config.meta.stepType ?? '-'} / ${config.meta.gameType}`} />
          <InfoRow label="课次" value={config.meta.lessonName ?? '-'} />
          <InfoRow label="题包" value={config.meta.animationPrefabName} />
          <InfoRow label="模板包" value={config.meta.gameCcbName} />
          <InfoRow label="问题文本" value={config.meta.questionText} />
          <InfoRow label="Question Key" value={config.meta.questionKey} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>当前进度</Text>
          <Text style={styles.progressText}>
            Group {groupIndex + 1}/{config.groups.length} · Step {subIndex + 1}/
            {currentGroup.subContents.length} · Overall {completedSubCount + 1}/{totalSubCount}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {width: `${((completedSubCount + 1) / totalSubCount) * 100}%`},
              ]}
            />
          </View>
          <Text style={styles.phaseText}>当前阶段：{phaseLabel(phase)}</Text>
          {countdown !== null ? (
            <Text style={styles.countdown}>录音倒计时：{countdown}s</Text>
          ) : null}
        </View>

        <View style={styles.sceneRow}>
          <SceneActor title="NPC 1" subtitle={phase === 'npc1' ? 'active' : 'idle'} />
          <SceneActor title="NPC 2" subtitle={phase === 'npc2' ? 'active' : 'idle'} />
          <SceneActor title="User" subtitle={phase === 'record' ? 'recording' : 'waiting'} />
          <SceneActor title="Target" subtitle={currentSub.readInfo.matchTexts.join(' / ')} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>子题内容</Text>
          <InfoRow label="Sub ID" value={String(currentSub.id)} />
          <InfoRow label="录音时长" value={`${currentSub.recordTime}s`} />
          <InfoRow label="音素识别" value={currentSub.isMatchPhone ? '开启' : '关闭'} />
          <InfoRow label="句子模式" value={currentSub.hasSentence ? '是' : '否'} />

          <Text style={styles.sectionLabel}>跟读文本</Text>
          <View style={styles.tagRow}>
            {currentSub.readInfo.matchTexts.map(text => (
              <Tag key={text} label={text} />
            ))}
          </View>

          {currentSub.readInfo.matchPhoneText.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>音素文本</Text>
              <View style={styles.tagRow}>
                {currentSub.readInfo.matchPhoneText
                  .filter(Boolean)
                  .map(text => (
                    <Tag key={text} label={text} accent />
                  ))}
              </View>
            </>
          ) : null}

          {currentSub.titleImagePath ? (
            <>
              <Text style={styles.sectionLabel}>题图</Text>
              <Image source={{uri: currentSub.titleImagePath}} style={styles.remoteImage} />
            </>
          ) : null}

          {currentSub.knowledgeImage ? (
            <>
              <Text style={styles.sectionLabel}>知识点图</Text>
              <Image source={{uri: currentSub.knowledgeImage}} style={styles.remoteImage} />
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>资源指针</Text>
          <InfoRow label="标准音频" value={currentSub.standardAudio ?? '-'} />
          <InfoRow label="NPC1 音频" value={npc1Audio} />
          <InfoRow label="NPC2 音频" value={npc2Audio} />
          <InfoRow label="入场视频" value={currentSub.titleVideoEntry ?? '-'} />
          <InfoRow label="弱反馈视频" value={currentSub.titleVideoWeakFeedback ?? '-'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spine 播放链</Text>
          <Text style={styles.spineBody}>
            这里直接接的是 `u3d_prefab_followread_word` 模板里的真实 Spine 资源，
            先验证 RN 到 Spine Web Player 的加载和播放通路。
          </Text>
          <SpineWebPlayer
            assetKey="challengeTarget"
            title="ChallengeTarget"
            subtitle="Template Spine · followread target"
          />
          <SpineWebPlayer
            assetKey="vsShow"
            title="vs_show"
            subtitle="Template Spine · followread intro effect"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>模板控制台</Text>
          <View style={styles.controls}>
            <ActionButton label="上一步" onPress={goToPrevStep} />
            <ActionButton label="下一阶段" onPress={goToNextPhase} primary />
            <ActionButton label="下一题" onPress={goToNextStep} />
          </View>
          <View style={styles.controls}>
            <ActionButton label="重置阶段" onPress={() => setPhase('ready')} />
            <ActionButton label="直接录音" onPress={() => setPhase('record')} />
            <ActionButton label="直接反馈" onPress={() => setPhase('feedback')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Tag({label, accent = false}: {label: string; accent?: boolean}) {
  return (
    <View style={[styles.tag, accent && styles.tagAccent]}>
      <Text style={[styles.tagText, accent && styles.tagAccentText]}>{label}</Text>
    </View>
  );
}

function SceneActor({title, subtitle}: {title: string; subtitle: string}) {
  return (
    <View style={styles.actorCard}>
      <Text style={styles.actorTitle}>{title}</Text>
      <Text style={styles.actorSubtitle}>{subtitle}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionButton, primary && styles.actionButtonPrimary]}>
      <Text style={[styles.actionButtonText, primary && styles.actionButtonTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  eyebrow: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  heroBody: {
    color: '#e5e7eb',
    lineHeight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 14,
    color: '#0f172a',
  },
  progressText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  phaseText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  countdown: {
    color: '#dc2626',
    fontWeight: '700',
  },
  spineBody: {
    color: '#334155',
    lineHeight: 20,
  },
  sceneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actorCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: '#dbeafe',
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  actorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  actorSubtitle: {
    color: '#1e40af',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagAccent: {
    backgroundColor: '#d1fae5',
  },
  tagText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  tagAccentText: {
    color: '#065f46',
  },
  remoteImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  actionButtonPrimary: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  actionButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  actionButtonTextPrimary: {
    color: '#fff',
  },
});
