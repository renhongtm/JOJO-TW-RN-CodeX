import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  EmbeddedSpineAsset,
  followReadSpineAssets,
  localSpinePlayerScript,
  localSpinePlayerStyle,
} from './generated/followReadSpineAssets';

interface SpineWebPlayerProps {
  assetKey: 'challengeTarget' | 'vsShow';
  title: string;
  subtitle: string;
}

/**
 * Spine Web Player：按动画包围盒适配画布。viewportShrink 小于 1 会拉近相机（仅 vs_show）。
 * ChallengeTarget：默认取景（shrink=1），不做 RN 整页放大，与官方 Player 一致。
 */
const FOLLOWREAD_SPINE_VIEWPORT_SHRINK = 0.38;

const VIEWPORT_SHRINK_BY_KEY: Record<SpineWebPlayerProps['assetKey'], number> = {
  challengeTarget: 1,
  vsShow: FOLLOWREAD_SPINE_VIEWPORT_SHRINK,
};

const escapedLocalSpinePlayerScript = localSpinePlayerScript.replace(
  /<\/script/gi,
  '<\\/script',
);

function buildPlayerHtml(
  asset: EmbeddedSpineAsset,
  viewportShrink: number,
): string {
  const config = {
    skelUrl: asset.skeletonFileName,
    atlasUrl: asset.atlasFileName,
    rawDataURIs: {
      [asset.skeletonFileName]: asset.skeletonDataUri,
      [asset.atlasFileName]: asset.atlasDataUri,
      [asset.imageFileName]: asset.imageDataUri,
    },
    showControls: false,
    showLoading: false,
    interactive: false,
    alpha: true,
    backgroundColor: '#00000000',
    premultipliedAlpha: true,
  };

  const viewportShrinkJson = JSON.stringify(viewportShrink);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      ${localSpinePlayerStyle}
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
        -webkit-text-size-adjust: 100%;
      }
      #player {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
      }
      .spine-player {
        width: 100% !important;
        height: 100% !important;
      }
      .spine-player canvas {
        display: block;
      }
      .spine-player-controls {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script>
      function post(payload) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function getSpineRuntime() {
        if (window.spine && window.spine.SpinePlayer) {
          return window.spine;
        }

        return null;
      }

      function applyViewportShrink(player, animName, shrink) {
        if (!player || !animName || !(shrink > 0 && shrink < 1)) {
          return;
        }
        try {
          player.config.viewport = player.config.viewport || {};
          player.config.viewport.animations = player.config.viewport.animations || {};
          var calc = player.calculateAnimationViewport(animName);
          if (!calc || !(calc.width > 0) || !(calc.height > 0)) {
            return;
          }
          var cx = calc.x + calc.width * 0.5;
          var cy = calc.y + calc.height * 0.5;
          var w = calc.width * shrink;
          var h = calc.height * shrink;
          player.config.viewport.animations[animName] = {
            x: cx - w * 0.5,
            y: cy - h * 0.5,
            width: w,
            height: h,
            padLeft: 0,
            padRight: 0,
            padTop: 0,
            padBottom: 0,
          };
        } catch (e) {
        }
      }

      function createPlayer() {
        try {
          const spineRuntime = getSpineRuntime();
          if (!spineRuntime || !spineRuntime.SpinePlayer) {
            throw new Error('Spine Web Player script did not expose window.spine.SpinePlayer');
          }

          const config = ${JSON.stringify(config)};
          var viewportShrink = ${viewportShrinkJson};
          new spineRuntime.SpinePlayer('player', Object.assign({}, config, {
            success: function (player) {
              window.__frSpinePlayer = player;
              window.__frViewportShrink = viewportShrink;
              window.__frPlayAnimation = function (name) {
                var p = window.__frSpinePlayer;
                if (!p || !name) {
                  return;
                }
                p.config.animation = name;
                applyViewportShrink(p, name, window.__frViewportShrink);
                p.setAnimation(name, true);
              };

              if (
                player &&
                viewportShrink > 0 &&
                viewportShrink < 1 &&
                player.config.animation &&
                player.skeleton &&
                player.skeleton.data
              ) {
                applyViewportShrink(player, player.config.animation, viewportShrink);
                player.setAnimation(player.config.animation, true);
              }

              const animations = player && player.skeleton && player.skeleton.data
                ? player.skeleton.data.animations.map(function (animation) {
                    return animation.name;
                  })
                : [];

              post({
                type: 'success',
                assetKey: ${JSON.stringify(asset.key)},
                animations: animations,
              });
            },
            error: function (_player, reason) {
              post({
                type: 'error',
                assetKey: ${JSON.stringify(asset.key)},
                reason: String(reason || 'Unknown spine player error'),
              });
            },
          }));
        } catch (error) {
          post({
            type: 'error',
            assetKey: ${JSON.stringify(asset.key)},
            reason: String(error && error.message ? error.message : error),
          });
        }
      }

      window.addEventListener('load', function () {
        createPlayer();
      });
    </script>
    <script>
      ${escapedLocalSpinePlayerScript}
    </script>
  </body>
</html>`;
}

export function SpineWebPlayer({
  assetKey,
  title,
  subtitle,
}: SpineWebPlayerProps) {
  const [status, setStatus] = useState<string>('Loading...');
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  /** Sync list for onLoadEnd kick — success may arrive after first load event. */
  const animationNamesRef = useRef<string[]>([]);

  const asset = useMemo(
    () => followReadSpineAssets.find(item => item.key === assetKey) ?? null,
    [assetKey],
  );

  const html = useMemo(
    () =>
      asset
        ? buildPlayerHtml(asset, VIEWPORT_SHRINK_BY_KEY[assetKey])
        : '',
    [asset, assetKey],
  );

  const playAnimationByName = useCallback((name: string) => {
    const wv = webViewRef.current;
    if (!wv) {
      return;
    }
    const safe = JSON.stringify(name);
    wv.injectJavaScript(`
      (function () {
        if (window.__frPlayAnimation) {
          window.__frPlayAnimation(${safe});
        }
      })();
      true;
    `);
    setActiveAnimation(name);
  }, []);

  const handleSpineWebLoadEnd = useCallback(() => {
    const first = animationNamesRef.current[0];
    if (first) {
      playAnimationByName(first);
    }
  }, [playAnimationByName]);

  const handleSpineWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data);
        if (payload.type === 'success') {
          const names = Array.isArray(payload.animations) ? payload.animations : [];
          animationNamesRef.current = names;
          setAnimationNames(names);
          const initial = names[0] ?? null;
          setActiveAnimation(prev =>
            prev && names.includes(prev) ? prev : initial,
          );
          setStatus(
            names.length
              ? `Ready · 点击下方名称播放 · 共 ${names.length} 个`
              : 'Ready · 无动画列表',
          );
          if (initial) {
            setTimeout(() => playAnimationByName(initial), 250);
          }
          return;
        }

        setStatus(`Error · ${payload.reason ?? 'Unknown error'}`);
      } catch (error) {
        setStatus(`Error · ${String(error)}`);
      }
    },
    [playAnimationByName],
  );

  const androidLayerType =
    Platform.OS === 'android' ? 'hardware' : undefined;

  if (!asset) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.statusError}>Missing embedded Spine asset: {assetKey}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.playerShell} collapsable={false}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webView}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          nestedScrollEnabled
          {...(androidLayerType != null ? {androidLayerType} : {})}
          onLoadEnd={handleSpineWebLoadEnd}
          onMessage={handleSpineWebMessage}
        />
      </View>
      {animationNames.length > 0 ? (
        <View style={styles.animPicker}>
          <Text style={styles.animPickerLabel}>动画</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.animChipRow}>
            {animationNames.map((name, index) => (
              <Pressable
                key={`${assetKey}-${index}-${name}`}
                onPress={() => playAnimationByName(name)}
                style={[
                  styles.animChip,
                  activeAnimation === name && styles.animChipActive,
                ]}>
                <Text
                  style={[
                    styles.animChipText,
                    activeAnimation === name && styles.animChipTextActive,
                  ]}
                  numberOfLines={1}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  playerShell: {
    width: '100%',
    height: 220,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#dbeafe',
  },
  webView: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  animPicker: {
    gap: 8,
  },
  animPickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  animChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  animChip: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  animChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  animChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  animChipTextActive: {
    color: '#1d4ed8',
  },
  status: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  statusError: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
});
