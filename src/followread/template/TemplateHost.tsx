import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FollowReadConfig } from '../types';
import { FollowReadWordTemplate } from './FollowReadWordTemplate';

interface TemplateHostProps {
  config: FollowReadConfig;
}

export function TemplateHost({ config }: TemplateHostProps) {
  if (config.meta.gameScriptName === 'u3d_game_followread_word') {
    return <FollowReadWordTemplate config={config} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>未识别的模板</Text>
      <Text style={styles.body}>{config.meta.gameScriptName || '空模板名'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
  },
});
